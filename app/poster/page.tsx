"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import { ArrowLeft, CheckCircle, Clock, XCircle, Pencil } from "lucide-react";
import Link from "next/link";

export default function PosterPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [status, setStatus] = useState<"none" | "pending" | "approved" | "rejected">("none");
    const [rejectionReason, setRejectionReason] = useState<string | null>(null);
    const [formData, setFormData] = useState({ title: "", description: "" });
    const [submitting, setSubmitting] = useState(false);
    const [isRetryMode, setIsRetryMode] = useState(false);

    useEffect(() => {
        const checkStatus = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                router.push("/login");
                return;
            }

            // Check if already approved in user_profile
            const { data: profile } = await supabase
                .from("user_profile")
                .select("can_post")
                .eq("id", user.id)
                .single();
            
            if (profile?.can_post) {
                setStatus("approved");
                setLoading(false);
                return;
            }

            // Check for existing request
            const { data: request } = await supabase
                .from("verification_requests")
                .select("status, rejection_reason")
                .eq("user_id", user.id)
                .eq("request_type", "poster")
                .order("created_at", { ascending: false })
                .limit(1)
                .maybeSingle();

            if (request) {
                setStatus(request.status as any);
                if (request.rejection_reason) setRejectionReason(request.rejection_reason);
            }
            setLoading(false);
        };
        checkStatus();
    }, [router]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);

        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { error } = await supabase.from("verification_requests").insert({
            user_id: user.id,
            title: formData.title,
            description: formData.description,
            status: "pending",
            request_type: "poster",
            terms_accepted: true
        });

        if (error) {
            alert("Gagal mengirim pengajuan. Silakan coba lagi.");
            console.error(error);
        } else {
            setStatus("pending");
            setIsRetryMode(false);
        }
        setSubmitting(false);
    };

    if (loading) return <div className="p-8 text-center text-gray-500">Memuat status pengajuan...</div>;

    if (status === "approved") {
        return (
            <div className="max-w-xl mx-auto px-4 py-12 text-center">
                <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-6">
                    <CheckCircle size={32} />
                </div>
                <h1 className="text-2xl font-bold mb-2">Izin Poster Disetujui</h1>
                <p className="text-gray-600 mb-8">Selamat! Kamu sudah bisa membuat tulisan. Mulai berbagi pemikiran kamu sekarang!</p>
                <Link href="/write" className="bg-black text-white px-6 py-2 rounded-full font-medium hover:bg-gray-800 transition inline-flex items-center gap-2">
                    <Pencil size={18} />
                    Mulai Menulis
                </Link>
            </div>
        );
    }

    if (status === "pending") {
        return (
            <div className="max-w-xl mx-auto px-4 py-12 text-center">
                <style jsx>{`
                    @keyframes scan {
                        0% { transform: translateY(-100%); }
                        100% { transform: translateY(250%); }
                    }
                    .animate-scan {
                        animation: scan 3s ease-in-out infinite;
                    }
                `}</style>
                
                <div className="relative w-32 h-32 mx-auto mb-8 flex items-center justify-center">
                    <div className="absolute inset-0 bg-blue-50 rounded-full animate-ping opacity-75 duration-[3000ms]"></div>
                    <div className="absolute inset-4 bg-blue-100 rounded-full animate-pulse opacity-50"></div>
                    
                    <div className="relative w-20 h-24 bg-white border-2 border-gray-200 rounded-lg shadow-sm overflow-hidden flex flex-col p-3 gap-2 z-10">
                        <div className="flex gap-2 items-center mb-1">
                             <div className="w-6 h-6 bg-gray-200 rounded-full"></div>
                             <div className="h-2 w-8 bg-gray-200 rounded"></div>
                        </div>
                        <div className="h-1.5 w-full bg-gray-100 rounded"></div>
                        <div className="h-1.5 w-full bg-gray-100 rounded"></div>
                        <div className="h-1.5 w-3/4 bg-gray-100 rounded"></div>
                        <div className="h-1.5 w-1/2 bg-gray-100 rounded"></div>

                        <div className="absolute top-0 left-0 right-0 h-8 bg-gradient-to-b from-transparent via-blue-200/50 to-transparent border-b border-blue-400/50 animate-scan z-20"></div>
                    </div>
                    
                    <div className="absolute -bottom-2 -right-2 bg-blue-500 text-white p-2 rounded-full border-4 border-white z-20 shadow-sm">
                        <Clock size={20} className="animate-spin-slow" style={{ animationDuration: '4s' }} />
                    </div>
                </div>

                <h1 className="text-2xl font-bold mb-2 text-gray-900">Pengajuan Sedang Ditinjau</h1>
                <p className="text-gray-600 mb-8 max-w-md mx-auto leading-relaxed">
                    Terima kasih telah mengajukan izin poster.<br/>
                    Pengajuan kamu sedang ditinjau. Proses ini biasanya memakan waktu suka-suka si Ahadi.
                </p>
                
                <div className="flex flex-col gap-3 justify-center items-center">
                     <Link href="/" className="px-6 py-2.5 bg-gray-900 text-white rounded-full font-medium hover:bg-black transition-all hover:scale-105 active:scale-95 shadow-lg shadow-gray-200/50">
                        Kembali ke Beranda
                    </Link>
                    <button onClick={() => window.location.reload()} className="text-sm text-gray-500 hover:text-gray-900 font-medium px-4 py-2 rounded-lg hover:bg-gray-50 transition">
                        Cek Status Terbaru
                    </button>
                </div>
            </div>
        );
    }

    if (status === "rejected" && !isRetryMode) {
        return (
             <div className="max-w-xl mx-auto px-4 py-12 text-center">
                <style jsx>{`
                    @keyframes stamp {
                        0% { opacity: 0; transform: scale(3) rotate(-10deg); }
                        100% { opacity: 1; transform: scale(1) rotate(-10deg); }
                    }
                    .animate-stamp {
                        animation: stamp 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards;
                    }
                `}</style>
                
                <div className="relative w-40 h-40 mx-auto mb-10 flex items-center justify-center">
                     <div className="absolute top-0 left-4 w-24 h-32 bg-gray-50 border border-gray-200 rounded shadow-sm -rotate-6"></div>
                     <div className="absolute top-2 right-4 w-24 h-32 bg-white border border-gray-200 rounded shadow-md rotate-3 z-10"></div>
                     
                     <div className="absolute inset-0 z-20 flex items-center justify-center opacity-0 animate-stamp" style={{ animationDelay: '0.2s' }}>
                        <div className="w-32 h-32 rounded-full border-4 border-red-500 flex items-center justify-center bg-red-50/90 backdrop-blur-sm shadow-xl">
                            <XCircle size={64} className="text-red-500" strokeWidth={2.5} />
                        </div>
                     </div>
                </div>

                <h1 className="text-3xl font-bold mb-4 text-gray-900">Pengajuan Ditolak</h1>
                
                <div className="bg-red-50 border border-red-100 p-6 mb-8 text-left max-w-md mx-auto">
                    <p className="text-xs font-bold text-red-600 uppercase tracking-widest mb-2 flex items-center gap-2">
                        <XCircle size={14} className="fill-red-600 text-white" />
                        Alasan Penolakan
                    </p>
                    <p className="text-gray-800 text-lg leading-relaxed font-medium">
                        "{rejectionReason || "Pengajuan belum memenuhi kriteria."}"
                    </p>
                </div>

                <p className="text-gray-500 mb-8 max-w-sm mx-auto">
                    Jangan khawatir, kamu dapat memperbaiki data dan mengajukan kembali.
                </p>

                <div className="flex flex-col gap-4 justify-center items-center">
                    <button 
                        onClick={() => setIsRetryMode(true)}
                        className="px-8 py-2 cursor-pointer bg-black text-white text-lg rounded-full font-bold hover:bg-gray-800 hover:scale-105 active:scale-95 transition-all"
                    >
                        Ajukan Kembali
                    </button>
                    <Link href="/" className="text-gray-500 hover:text-black text-sm font-medium">
                        Kembali ke Beranda
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-2xl mx-auto px-4 py-8">
            <button onClick={() => router.back()} className="flex items-center text-gray-500 hover:text-black mb-6 transition">
                <ArrowLeft size={18} className="mr-2" /> Kembali
            </button>

            <h1 className="text-3xl font-bold mb-2">{isRetryMode ? "Ajukan Kembali" : "Ajukan Izin Poster"}</h1>
            <p className="text-gray-600 mb-8">Ajukan izin poster untuk dapat membuat dan mempublikasikan tulisan di platform ini.</p>
            
            <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                    <label className="block font-bold mb-2 text-gray-800">Judul Pengajuan</label>
                    <input 
                        type="text" 
                        required
                        className="w-full border border-gray-300 rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-black"
                        placeholder="Contoh: Penulis Pemula / Mahasiswa"
                        value={formData.title}
                        onChange={e => setFormData({...formData, title: e.target.value})}
                    />
                </div>

                <div>
                    <label className="block font-bold mb-2 text-gray-800">Alasan Pengajuan</label>
                    <textarea 
                        required
                        rows={5}
                        className="w-full border border-gray-300 rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-black"
                        placeholder="Jelaskan mengapa kamu ingin menjadi poster di platform ini..."
                        value={formData.description}
                        onChange={e => setFormData({...formData, description: e.target.value})}
                    />
                </div>

                <div className="flex items-start gap-3 p-4 bg-gray-50 rounded-lg">
                    <input 
                        type="checkbox" 
                        required 
                        id="terms"
                        className="mt-1 w-4 h-4 text-black rounded border-gray-300 focus:ring-black"
                    />
                    <label htmlFor="terms" className="text-sm text-gray-600">
                        Saya menyetujui <Link href="/kebijakan/layanan" className="text-blue-600 hover:underline">Kebijakan Layanan</Link> dan <Link href="/kebijakan/privasi" className="text-blue-600 hover:underline">Kebijakan Privasi</Link>, serta menjamin bahwa data yang saya berikan adalah benar.
                    </label>
                </div>

                <button 
                    type="submit" 
                    disabled={submitting}
                    className="w-full bg-black text-white cursor-pointer font-bold py-3 rounded-lg hover:bg-gray-800 transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {submitting ? "Mengirim..." : "Kirim Pengajuan"}
                </button>
            </form>
        </div>
    );
}
