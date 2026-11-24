// Export statico: nessun server, tutto gira nel browser del telefono.
// Se pubblichi in una sottocartella (es. GitHub Pages), builda con BASE_PATH=/nome-repo
const basePath = process.env.BASE_PATH || ""

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "export",
  trailingSlash: true,
  basePath,
  assetPrefix: basePath || undefined,
  env: { NEXT_PUBLIC_BASE_PATH: basePath },
  images: { unoptimized: true },
}

export default nextConfig
