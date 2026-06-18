import React from 'react';
import heroBg from '../assets/hero-bg.png';
import Card from '../components/Card';
import { 
  TrendingDown, 
  HelpCircle, 
  Map, 
  AlertTriangle,
  ArrowRight,
  TrendingUp,
  Percent,
  Compass,
  FileText
} from 'lucide-react';

export default function Beranda() {
  const stats = [
    { 
      title: "Produksi Garam Nasional", 
      value: "2.35 Juta Ton", 
      subtitle: "Proyeksi Thn 2026", 
      color: "border-brand-navy",
      icon: TrendingUp,
      iconColor: "text-brand-navy"
    },
    { 
      title: "Total Konsumsi & Industri", 
      value: "4.55 Juta Ton", 
      subtitle: "Kebutuhan Domestik", 
      color: "border-slate-400",
      icon: TrendingDown,
      iconColor: "text-slate-600"
    },
    { 
      title: "Defisit Rantai Pasok", 
      value: "-2.20 Juta Ton", 
      subtitle: "Dipenuhi Impor", 
      color: "border-amber-500",
      icon: AlertTriangle,
      iconColor: "text-amber-500"
    },
    { 
      title: "Indeks Swasembada", 
      value: "51.6%", 
      subtitle: "Target Target 100%", 
      color: "border-brand-accent",
      icon: Percent,
      iconColor: "text-brand-accent"
    }
  ];

  return (
    <div className="space-y-6 md:space-y-8 animate-fade-in p-4 md:p-6">
      
      {/* Title & Introduction Section */}
      <div 
        className="relative text-white rounded-3xl p-6 md:p-12 shadow-lg overflow-hidden bg-cover bg-center bg-no-repeat bg-fixed"
        style={{ backgroundImage: `url(${heroBg})` }}
      >
        {/* Dark Overlay 20% */}
        <div className="absolute inset-0 bg-black/20 pointer-events-none"></div>
        
        <div className="relative z-10 max-w-4xl space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-brand-accent/20 border border-brand-accent/30 rounded-full text-xs font-semibold text-brand-accent">
            <Compass size={14} />
            <span>Sistem Pendukung Keputusan Kebijakan Garam</span>
          </div>
          
          <h2 className="text-2xl md:text-4xl font-extrabold tracking-tight leading-tight drop-shadow-md">
            Analisis Kebijakan Rantai Pasok Garam Madura Berbasis Integrasi <span className="text-brand-accent">System Dynamics</span> dan <span className="text-brand-accent">Analytic Network Process</span>
          </h2>
          
          <p className="text-slate-200 text-sm md:text-base leading-relaxed font-light drop-shadow-md">
            Platform analisis kebijakan yang dirancang untuk mensimulasikan dinamika rantai pasok Garam Madura, mengevaluasi hubungan antar faktor strategis, serta menguji dampak berbagai skenario kebijakan dalam mendukung keberlanjutan produksi, distribusi, dan kesejahteraan petani garam.
          </p>

          <div className="pt-2 flex flex-wrap gap-3">
            <span className="text-xs px-2.5 py-1 bg-black/40 rounded-md border border-white/20 text-slate-100 backdrop-blur-sm shadow-sm">
              Metode: System Dynamics (SD)
            </span>
            <span className="text-xs px-2.5 py-1 bg-black/40 rounded-md border border-white/20 text-slate-100 backdrop-blur-sm shadow-sm">
              Metode: Analytic Network Process (ANP)
            </span>
            <span className="text-xs px-2.5 py-1 bg-black/40 rounded-md border border-white/20 text-slate-100 backdrop-blur-sm shadow-sm">
              Fokus: Penguatan Rantai Pasok Garam Madura
            </span>
          </div>
        </div>
      </div>

      {/* Quick Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        {stats.map((stat, i) => {
          const Icon = stat.icon;
          return (
            <div 
              key={i} 
              className={`bg-white border-l-4 ${stat.color} shadow-sm rounded-xl p-5 hover:shadow-md transition-all duration-300 hover:-translate-y-1 flex justify-between items-start`}
            >
              <div className="space-y-1">
                <span className="text-xs text-brand-grayDark font-semibold uppercase tracking-wider block">
                  {stat.title}
                </span>
                <span className="text-2xl md:text-3xl font-extrabold text-slate-800 tracking-tight block">
                  {stat.value}
                </span>
                <span className="text-[11px] text-slate-400 font-medium block">
                  {stat.subtitle}
                </span>
              </div>
              <div className={`p-2 rounded-lg bg-slate-50 border border-slate-100 ${stat.iconColor}`}>
                <Icon size={20} />
              </div>
            </div>
          );
        })}
      </div>

      {/* Problem & Methodology Block */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8">
        
        {/* Left Column: Latar Belakang Masalah */}
        <div className="lg:col-span-2 space-y-6">
          <Card 
            title="Latar Belakang & Perumusan Masalah"
            subtitle="Problematika Rantai Pasok Garam Indonesia"
          >
            <div className="space-y-4">
              <p>
                Indonesia merupakan negara maritim dengan garis pantai terpanjang kedua di dunia, namun masih menghadapi kendala besar dalam pemenuhan kebutuhan garam nasional secara mandiri. Kebutuhan garam industri bernilai NaCl tinggi (&gt;97%) sebagian besar dipenuhi melalui impor.
              </p>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 my-2">
                <div className="p-4 bg-red-50/50 border border-red-100 rounded-xl space-y-1">
                  <div className="flex items-center gap-2 text-red-700 font-bold text-xs uppercase tracking-wider">
                    <AlertTriangle size={14} />
                    <span>Kerentanan Cuaca</span>
                  </div>
                  <p className="text-xs text-red-600">
                    Produksi garam rakyat sangat tergantung pada panjang musim kemarau. Anomali cuaca (seperti La Niña) mengakibatkan penurunan drastis hasil panen nasional.
                  </p>
                </div>
                
                <div className="p-4 bg-amber-50/50 border border-amber-100 rounded-xl space-y-1">
                  <div className="flex items-center gap-2 text-amber-700 font-bold text-xs uppercase tracking-wider">
                    <TrendingDown size={14} />
                    <span>Rendahnya Harga Tingkat Petani</span>
                  </div>
                  <p className="text-xs text-amber-600">
                    Rantai distribusi garam yang panjang dan tidak efisien menyebabkan rendahnya harga jual garam di tingkat petani lokal saat panen raya.
                  </p>
                </div>
              </div>

              <p>
                Mengatasi masalah ini memerlukan intervensi kebijakan yang menyeluruh. Pendekatan <strong>System Dynamics</strong> memetakan aliran fisik garam serta memproyeksikan stok nasional 10 tahun mendatang. Pendekatan <strong>Analytic Network Process (ANP)</strong> melengkapinya dengan merangkum bobot kriteria strategis (kualitas, biaya, keandalan) berdasarkan kuesioner pakar secara objektif.
              </p>
            </div>
          </Card>
        </div>

        {/* Right Column: Kerangka Integrasi SD & ANP */}
        <div className="space-y-6">
          <Card 
            title="Kerangka Integrasi SD-ANP" 
            subtitle="Alur Pemikiran Metodologis"
          >
            <div className="space-y-4 text-xs md:text-sm">
              <p>
                Integrasi kedua metode bertujuan memanfaatkan kekuatan masing-masing untuk pengambilan keputusan komprehensif:
              </p>
              
              <div className="space-y-3 mt-2">
                <div className="flex gap-3">
                  <div className="h-6 w-6 rounded-full bg-brand-navy text-white flex items-center justify-center font-bold text-xs flex-shrink-0">1</div>
                  <div>
                    <h4 className="font-semibold text-slate-800">Analisis Kualitatif (ANP)</h4>
                    <p className="text-[11px] text-brand-grayDark">Membobot kriteria dan alternatif berdasarkan persepsi akademisi, praktisi, dan regulator.</p>
                  </div>
                </div>

                <div className="flex gap-3">
                  <div className="h-6 w-6 rounded-full bg-brand-accent text-white flex items-center justify-center font-bold text-xs flex-shrink-0">2</div>
                  <div>
                    <h4 className="font-semibold text-slate-800">Parameter Dinamis (SD)</h4>
                    <p className="text-[11px] text-brand-grayDark">Bobot alternatif ANP digunakan untuk menyetel tingkat efektivitas skenario kebijakan dalam simulasi.</p>
                  </div>
                </div>

                <div className="flex gap-3">
                  <div className="h-6 w-6 rounded-full bg-slate-900 text-white flex items-center justify-center font-bold text-xs flex-shrink-0">3</div>
                  <div>
                    <h4 className="font-semibold text-slate-800">Rekomendasi Optimal</h4>
                    <p className="text-[11px] text-brand-grayDark">Melihat skenario manakah yang memberikan performa stok garam terbaik dengan biaya minimum.</p>
                  </div>
                </div>
              </div>
            </div>
          </Card>
        </div>

      </div>

      {/* Full-width Card: Diagram Alir Integrasi (Interactive SVG) */}
      <Card 
        title="Visualisasi Kerangka Kerja Integrasi Metode (SD-ANP)"
        subtitle="Aliran feedback loop kualitatif ke dalam parameter simulasi kuantitatif"
      >
        <div className="w-full bg-slate-50 border border-brand-grayMedium rounded-2xl p-6 flex flex-col items-center overflow-x-auto">
          {/* Flowchart SVG */}
          <svg width="780" height="150" viewBox="0 0 780 150" className="mx-auto min-w-[700px] text-slate-700">
            {/* Box 1: ANP Network */}
            <rect x="10" y="35" width="160" height="80" rx="12" fill="#1E3A8A" />
            <text x="90" y="70" fill="white" fontSize="13" fontWeight="bold" textAnchor="middle">ANP Model</text>
            <text x="90" y="90" fill="#CBD5E1" fontSize="10" textAnchor="middle">Kuesioner Bobot Pakar</text>
            
            {/* Arrow 1 */}
            <path d="M 170 75 L 210 75" stroke="#94A3B8" strokeWidth="2" fill="none" />
            <polygon points="210,75 202,70 202,80" fill="#94A3B8" />
            <text x="190" y="65" fontSize="9" fontWeight="bold" fill="#64748B" textAnchor="middle">Bobot</text>
            
            {/* Box 2: Bobot Strategi */}
            <rect x="220" y="35" width="160" height="80" rx="12" fill="#0F172A" />
            <text x="300" y="70" fill="white" fontSize="13" fontWeight="bold" textAnchor="middle">Skenario Intervensi</text>
            <text x="300" y="90" fill="#94A3B8" fontSize="10" textAnchor="middle">Bobot Kebijakan Terpilih</text>
            
            {/* Arrow 2 */}
            <path d="M 380 75 L 420 75" stroke="#94A3B8" strokeWidth="2" fill="none" />
            <polygon points="420,75 412,70 412,80" fill="#94A3B8" />
            <text x="400" y="65" fontSize="9" fontWeight="bold" fill="#64748B" textAnchor="middle">Input</text>
            
            {/* Box 3: System Dynamics */}
            <rect x="430" y="35" width="160" height="80" rx="12" fill="#06B6D4" />
            <text x="510" y="70" fill="white" fontSize="13" fontWeight="bold" textAnchor="middle">System Dynamics</text>
            <text x="510" y="90" fill="#083344" fontSize="10" textAnchor="middle">Persamaan Diferensial Stok</text>
            
            {/* Arrow 3 */}
            <path d="M 590 75 L 630 75" stroke="#94A3B8" strokeWidth="2" fill="none" />
            <polygon points="630,75 622,70 622,80" fill="#94A3B8" />
            <text x="610" y="65" fontSize="9" fontWeight="bold" fill="#64748B" textAnchor="middle">Simulasi</text>
            
            {/* Box 4: Hasil Keputusan */}
            <rect x="640" y="35" width="130" height="80" rx="12" fill="#10B981" />
            <text x="705" y="70" fill="white" fontSize="13" fontWeight="bold" textAnchor="middle">Hasil Terbaik</text>
            <text x="705" y="90" fill="#ECFDF5" fontSize="10" textAnchor="middle">Rekomendasi Kebijakan</text>
          </svg>

          <div className="mt-4 text-xs text-brand-grayDark font-medium max-w-2xl text-center">
            *Diagram interaktif di atas merepresentasikan struktur integrasi di mana penilaian matriks berpasangan dari ANP disuapkan ke dalam parameter efisiensi laju alih teknologi pada modul simulasi System Dynamics.
          </div>
        </div>
      </Card>

    </div>
  );
}
