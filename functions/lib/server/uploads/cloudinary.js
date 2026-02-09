// TODO HowlidayInn: Cloudinary upload configuration for dog documents and photos
export function registerCloudinaryRoutes(app) {
    app.get("/api/uploads/config", (req, res) => {
        if (process.env.UPLOADS_PROVIDER !== "cloudinary") {
            return res.status(400).json({ error: "Not using Cloudinary" });
        }
        res.json({
            cloudName: process.env.CLOUDINARY_CLOUD_NAME,
            uploadPreset: process.env.CLOUDINARY_UPLOAD_PRESET,
            folder: "howlidayinn/dog_docs",
            maxBytes: 10 * 1024 * 1024, // 10MB
            accept: ["image/jpeg", "image/png", "application/pdf"]
        });
    });
}
