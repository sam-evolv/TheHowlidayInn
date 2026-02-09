// Server-side business logic for dog status computation
import { admin } from './firebase-admin';
import { COLLECTIONS } from './types/dogProfile';
// Use Firestore from admin
const adminDb = admin.firestore();
/**
 * Compute dog verification status based on vaccinations and kennel requirements
 */
export async function computeDogStatus(dog, vaccinations, settings, bookingRange) {
    const issues = [];
    const today = new Date();
    // Check if breed is prohibited (case-insensitive)
    if (dog.breed && settings.prohibitedBreeds.some(breed => breed.toLowerCase() === dog.breed.toLowerCase())) {
        return {
            status: 'rejected',
            issues: [`Breed "${dog.breed}" is not permitted at our facility`]
        };
    }
    // If explicitly rejected by admin, return rejected status
    if (dog.status === 'rejected') {
        return {
            status: 'rejected',
            issues: dog.disallowedReason ? [dog.disallowedReason] : ['Rejected by administrator']
        };
    }
    // Check required vaccinations
    const validVaccinations = new Map();
    let earliestExpiry = null;
    for (const requiredVaccine of settings.requiredVaccines) {
        // Find the most recent vaccination of this type
        const vaccinesOfType = vaccinations
            .filter(v => v.type === requiredVaccine.type && v.verified)
            .sort((a, b) => {
            if (!a.dateAdministered || !b.dateAdministered)
                return 0;
            return new Date(b.dateAdministered).getTime() - new Date(a.dateAdministered).getTime();
        });
        const mostRecentVaccine = vaccinesOfType[0];
        if (!mostRecentVaccine) {
            issues.push(`Missing required vaccination: ${requiredVaccine.label}`);
            continue;
        }
        if (!mostRecentVaccine.validUntil) {
            issues.push(`${requiredVaccine.label} vaccination is missing expiry date`);
            continue;
        }
        const expiryDate = new Date(mostRecentVaccine.validUntil);
        // Check if vaccination covers today
        if (expiryDate < today) {
            issues.push(`${requiredVaccine.label} vaccination expired on ${formatDate(expiryDate)}`);
            continue;
        }
        // Check if vaccination covers the booking range if specified
        if (bookingRange) {
            const bookingEnd = new Date(bookingRange.end);
            if (expiryDate < bookingEnd) {
                issues.push(`${requiredVaccine.label} vaccination expires before booking end date`);
                continue;
            }
        }
        validVaccinations.set(requiredVaccine.type, mostRecentVaccine);
        // Track the earliest expiry date
        if (!earliestExpiry || expiryDate < earliestExpiry) {
            earliestExpiry = expiryDate;
        }
    }
    // Determine final status
    if (issues.length > 0) {
        // Check if any vaccinations are expired vs missing
        const hasExpiredVaccines = issues.some(issue => issue.includes('expired'));
        return {
            status: hasExpiredVaccines ? 'expired' : 'pending',
            issues,
            nextExpiry: earliestExpiry?.toISOString()
        };
    }
    // All required vaccinations are valid
    return {
        status: 'verified',
        nextExpiry: earliestExpiry?.toISOString()
    };
}
/**
 * Recompute and update dog status based on current vaccinations
 */
export async function recomputeAndUpdateDogStatus(dogId) {
    try {
        // Get dog data
        const dogDoc = await adminDb.collection(COLLECTIONS.DOGS).doc(dogId).get();
        if (!dogDoc.exists) {
            throw new Error('Dog not found');
        }
        const dog = { id: dogDoc.id, ...dogDoc.data() };
        // Don't auto-update rejected status (admin only)
        if (dog.status === 'rejected') {
            return;
        }
        // Get dog's vaccinations
        const vaccinationsSnapshot = await adminDb.collection(COLLECTIONS.VACCINATIONS)
            .where('dogId', '==', dogId)
            .get();
        const vaccinations = vaccinationsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        // Get kennel settings
        const settingsDoc = await adminDb.collection(COLLECTIONS.SETTINGS).doc('kennel').get();
        const settings = settingsDoc.exists ? settingsDoc.data() : getDefaultSettings();
        // Compute new status
        const statusResult = await computeDogStatus(dog, vaccinations, settings);
        // Update dog status if changed
        const updateData = {};
        if (dog.status !== statusResult.status) {
            updateData.status = statusResult.status;
        }
        if (dog.nextExpiry !== statusResult.nextExpiry) {
            updateData.nextExpiry = statusResult.nextExpiry;
        }
        if (Object.keys(updateData).length > 0) {
            updateData.updatedAt = new Date();
            await adminDb.collection(COLLECTIONS.DOGS).doc(dogId).update(updateData);
            console.log(`Updated dog ${dogId} status to ${statusResult.status}`);
        }
    }
    catch (error) {
        console.error(`Error recomputing dog status for ${dogId}:`, error);
    }
}
function getDefaultSettings() {
    return {
        requiredVaccines: [
            { type: 'rabies', label: 'Rabies', required: true, validityMonths: 12 },
            { type: 'dhpp', label: 'DHPP', required: true, validityMonths: 12 },
            { type: 'bordetella', label: 'Bordetella', required: true, validityMonths: 6 },
        ],
        prohibitedBreeds: [],
        leadTimeHours: 12,
    };
}
function formatDate(date) {
    return date.toLocaleDateString('en-IE', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });
}
