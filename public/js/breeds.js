// Breeds management
import { doc, getDoc } from 'https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore.js';
import { db } from './firebase-config.js';

let bannedBreeds = [];
let breedsLoaded = false;

// Load banned breeds from Firestore or fallback to local JSON
export async function loadBannedBreeds() {
  if (breedsLoaded) return bannedBreeds;
  
  try {
    // Try to load from Firestore first
    const breedsDoc = await getDoc(doc(db, 'settings', 'breeds'));
    if (breedsDoc.exists()) {
      bannedBreeds = breedsDoc.data().banned || [];
    } else {
      // Fallback to local JSON
      const response = await fetch('/data/bannedBreeds.json');
      bannedBreeds = await response.json();
    }
    breedsLoaded = true;
    return bannedBreeds;
  } catch (error) {
    console.error('Error loading banned breeds:', error);
    // Emergency fallback
    bannedBreeds = [
      'pit bull', 'american pit bull terrier', 'staffordshire bull terrier',
      'american staffordshire terrier', 'rottweiler', 'doberman pinscher',
      'german shepherd', 'mastiff', 'akita', 'chow chow', 'wolf hybrid'
    ];
    return bannedBreeds;
  }
}

// Normalize breed name for comparison
export function normalizeBreedName(breedName) {
  return breedName.toLowerCase().trim();
}

// Check if breed is banned
export async function isBreedBanned(breedName) {
  await loadBannedBreeds();
  const normalized = normalizeBreedName(breedName);
  
  return bannedBreeds.some(banned => {
    const normalizedBanned = normalizeBreedName(banned);
    return normalized.includes(normalizedBanned) || 
           normalizedBanned.includes(normalized);
  });
}

// Get list of banned breeds
export async function getBannedBreeds() {
  await loadBannedBreeds();
  return [...bannedBreeds];
}

// Popular dog breeds for autocomplete
export const POPULAR_BREEDS = [
  'Labrador Retriever',
  'Golden Retriever',
  'German Shepherd',
  'Bulldog',
  'Poodle',
  'Beagle',
  'Rottweiler',
  'Yorkshire Terrier',
  'Dachshund',
  'Siberian Husky',
  'Boxer',
  'Great Dane',
  'Cocker Spaniel',
  'Border Collie',
  'Australian Shepherd',
  'Shih Tzu',
  'Boston Terrier',
  'Chihuahua',
  'Jack Russell Terrier',
  'Cavalier King Charles Spaniel'
];

// Create breed autocomplete functionality
export function setupBreedAutocomplete(inputElement) {
  let currentFocus = -1;
  
  inputElement.addEventListener('input', function() {
    const val = this.value;
    closeAllLists();
    
    if (!val) return false;
    
    const listContainer = document.createElement('div');
    listContainer.setAttribute('id', this.id + '-autocomplete-list');
    listContainer.setAttribute('class', 'autocomplete-items');
    this.parentNode.appendChild(listContainer);
    
    const matches = POPULAR_BREEDS.filter(breed => 
      breed.toLowerCase().indexOf(val.toLowerCase()) > -1
    ).slice(0, 8);
    
    matches.forEach((breed, index) => {
      const item = document.createElement('div');
      const matchStart = breed.toLowerCase().indexOf(val.toLowerCase());
      const matchEnd = matchStart + val.length;
      
      item.innerHTML = breed.substr(0, matchStart) + 
                      '<strong>' + breed.substr(matchStart, val.length) + '</strong>' + 
                      breed.substr(matchEnd);
      item.innerHTML += '<input type="hidden" value="' + breed + '">';
      
      item.addEventListener('click', function() {
        inputElement.value = this.getElementsByTagName('input')[0].value;
        closeAllLists();
        inputElement.dispatchEvent(new Event('change'));
      });
      
      listContainer.appendChild(item);
    });
  });
  
  inputElement.addEventListener('keydown', function(e) {
    let items = document.getElementById(this.id + '-autocomplete-list');
    if (items) items = items.getElementsByTagName('div');
    
    if (e.keyCode === 40) { // Down arrow
      currentFocus++;
      addActive(items);
    } else if (e.keyCode === 38) { // Up arrow
      currentFocus--;
      addActive(items);
    } else if (e.keyCode === 13) { // Enter
      e.preventDefault();
      if (currentFocus > -1 && items) {
        items[currentFocus].click();
      }
    }
  });
  
  function addActive(items) {
    if (!items) return false;
    removeActive(items);
    if (currentFocus >= items.length) currentFocus = 0;
    if (currentFocus < 0) currentFocus = items.length - 1;
    items[currentFocus].classList.add('autocomplete-active');
  }
  
  function removeActive(items) {
    for (let i = 0; i < items.length; i++) {
      items[i].classList.remove('autocomplete-active');
    }
  }
  
  function closeAllLists() {
    const items = document.getElementsByClassName('autocomplete-items');
    for (let i = 0; i < items.length; i++) {
      items[i].parentNode.removeChild(items[i]);
    }
  }
  
  document.addEventListener('click', closeAllLists);
}