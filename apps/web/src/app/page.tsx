/* eslint-disable @next/next/no-img-element */
import Link from "next/link";

export default function Home() {
  return (
    <section
      className="w-full h-screen flex flex-col justify-center items-center bg-cover bg-center bg-no-repeat"
      style={{
        backgroundImage: "linear-gradient(rgba(0,0,0,.7), rgba(0,0,0,.7)), url('/back-home.jpg')",
      }}
    >
      <Link href="/" className="absolute top-0 left-15 flex items-center justify-center mb-3 md:mb-0 me-auto no-underline bg-white px-7 py-4 rounded-b-xl w-[17%]">
        <img
          src="/logo-selva.png"
          alt="SELVA"
          className="w-full"
        />
      </Link>
      <div className="text-center text-[4rem] leading-[6rem]">
        <div className="flex mb-2">
          <strong className="text-white drop-shadow-sm">Solução</strong>
          <span className="bg-[#c3e438] px-2 ml-2">de rastreabilidade</span>
          <span className="text-white ml-2">&</span>
        </div>
        <div className="flex">
          <p className="text-[#c3e438]">garantia de</p>
          <span className="bg-[#eef1f5] px-2 ml-2">transparência e segurança</span>
        </div>
        <div className="text-white underline underline-offset-4 decoration-[#6b700c] drop-shadow-sm">
          em cada etapa da cadeia produtiva
        </div>
      </div>
      <div className="mt-15">
        <Link href="/dashboard" className="bg-[#c3e438] hover:bg-[#eef1f5] text-[#252705] font-bold py-3 px-6 rounded-lg text-lg transition-colors duration-300">
          Acessar sistema
        </Link>
      </div>
    </section>
  );
}