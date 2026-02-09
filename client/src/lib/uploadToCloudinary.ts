export async function uploadToCloudinary(file: File): Promise<{ secure_url: string }> {
  const cloud = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
  const preset = "dog_docs_unsigned";
  if (!cloud) throw new Error("Missing VITE_CLOUDINARY_CLOUD_NAME");

  const fd = new FormData();
  fd.append("file", file);
  fd.append("upload_preset", preset);

  const res = await fetch(`https://api.cloudinary.com/v1_1/${cloud}/auto/upload`, { method: "POST", body: fd });
  if (!res.ok) throw new Error(await res.text());
  const json = await res.json();
  return { secure_url: json.secure_url };
}

export async function uploadManyToCloudinary(files: File[]): Promise<string[]> {
  const out: string[] = [];
  for (const f of files) {
    const result = await uploadToCloudinary(f);
    out.push(result.secure_url);
  }
  return out;
}