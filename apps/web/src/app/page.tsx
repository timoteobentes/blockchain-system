/* eslint-disable @next/next/no-img-element */
import Link from "next/link";

export default function Home() {
  return (
    <section
      className="relative w-full min-h-screen flex flex-col justify-center items-center bg-cover bg-center bg-no-repeat overflow-hidden"
      style={{
        backgroundImage: "url('/back-home.jpg')",
      }}
    >
      {/* Overlay to ensure text readability */}
      <div className="absolute inset-0 bg-black/50 bg-gradient-to-b from-black/70 via-black/40 to-black/80 z-0 pointer-events-none" />

      {/* Header with Centered Logo */}
      <header className="absolute top-0 left-0 w-full pt-8 md:pt-12 flex justify-center z-20">
        <Link href="/" className="group flex items-center justify-center w-48 md:w-56 transition-transform duration-500 hover:scale-105 focus:outline-none">
          <img
            src="/logo-selva.png"
            alt="SELVA"
            className="w-full object-contain filter grayscale contrast-200 invert mix-blend-screen drop-shadow-[0_0_25px_rgba(255,255,255,0.7)] opacity-95 group-hover:opacity-100 transition-opacity duration-300"
          />
        </Link>
      </header>

      {/* Main Content Container */}
      <main className="flex flex-col items-center justify-center px-6 w-full max-w-6xl z-10 mt-24 md:mt-16">
        
        {/* Typography Section */}
        <div className="text-center w-full">
          
          <div className="flex flex-col sm:flex-row flex-wrap items-center justify-center gap-3 md:gap-5 mb-8 md:mb-12" style={{ marginBottom: "1rem" }}>
            <strong className="text-white text-4xl sm:text-5xl md:text-6xl font-bold drop-shadow-xl tracking-wide">
              Solução
            </strong>
            <span className="bg-[#c3e438] text-[#252705] text-2xl sm:text-3xl md:text-4xl font-bold px-4 py-1.5 md:py-2 rounded-lg shadow-[0_0_20px_rgba(195,228,56,0.4)] whitespace-nowrap">
              de rastreabilidade
            </span>
            <span className="text-white/90 text-3xl sm:text-4xl md:text-5xl font-medium hidden sm:inline-block">&amp;</span>
          </div>

          <div className="flex flex-col sm:flex-row flex-wrap items-center justify-center gap-3 md:gap-5 mb-12 md:mb-16" style={{ marginBottom: "1rem" }}>
            <p className="text-[#c3e438] text-2xl sm:text-3xl md:text-4xl font-medium drop-shadow-md">
              garantia de
            </p>
            <span className="bg-[#eef1f5] text-[#1a1b02] text-2xl sm:text-3xl md:text-4xl font-bold px-4 py-1.5 md:py-2 rounded-lg shadow-xl whitespace-nowrap">
              transparência e segurança
            </span>
          </div>

          <div style={{ marginBottom: "2rem" }}>
            <h2 className="text-white/90 font-medium text-xl sm:text-2xl md:text-3xl lg:text-4xl tracking-wide">
              <span className="relative inline-block pb-2">
                em cada etapa da cadeia produtiva
                <div className="absolute bottom-0 left-0 w-full h-[3px] bg-gradient-to-r from-transparent via-[#c3e438] to-transparent opacity-80"></div>
              </span>
            </h2>
          </div>

        </div>

        {/* CTA Button */}
        <div className="mt-20 md:mt-28 z-10">
          <Link 
            href="/dashboard" 
            className="group relative inline-flex items-center justify-center px-12 py-5 md:px-16 md:py-6 font-bold text-[#252705] bg-[#c3e438] rounded-full overflow-hidden transition-all duration-300 hover:scale-105 hover:shadow-[0_0_40px_rgba(195,228,56,0.6)] focus:outline-none focus:ring-4 focus:ring-[#c3e438]/50"
            style={{ padding: "4px 18px" }}
          >
            {/* Glossy/Glass effect overlay on button */}
            <span className="absolute inset-0 w-full h-full bg-gradient-to-br from-white/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></span>
            
            <span className="relative flex items-center gap-3 text-lg md:text-xl uppercase tracking-wider">
              Acessar sistema
              <svg 
                className="w-5 h-5 md:w-6 md:h-6 transition-transform duration-300 group-hover:translate-x-1.5" 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24" 
                xmlns="http://www.w3.org/2000/svg"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M14 5l7 7m0 0l-7 7m7-7H3" />
              </svg>
            </span>
          </Link>
        </div>
      </main>

    </section>
  );
}