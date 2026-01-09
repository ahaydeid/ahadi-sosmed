"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import { Check, X, Clock, AlertTriangle } from "lucide-react";
import Link from "next/link";
import Image from "next/image";

const ADMIN_EMAILS = ["adihadi270@gmail.com", "adi.hadi270@gmail.com"];

import ConfirmModal from "@/app/components/ConfirmModal";

export default function AdminVerifyPage() {
    const router = useRouter();
    const [checkingAuth, setCheckingAuth] = useState(true);
    const [authorized, setAuthorized] = useState(false);
    const [requests, setRequests] = useState<any[]>([]);
    const [activeTab, setActiveTab] = useState<"pending" | "approved" | "rejected">("pending");

    // Modal State
    const [confirmModal, setConfirmModal] = useState({
        isOpen: false,
        title: "",
        message: "",
        confirmLabel: "",
        isDanger: false,
        onConfirm: () => {},
    });

    useEffect(() => {
        const checkAdmin = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user || !ADMIN_EMAILS.includes(user.email || "")) {
                router.replace("/"); // Use replace to prevent back navigation
                return;
            }
            setAuthorized(true);
            setCheckingAuth(false);
            fetchRequests(); // Fetch only after auth confirmed
        };
        checkAdmin();
    }, [router]);

    const [rejectingId, setRejectingId] = useState<string | null>(null);
    const [rejectionReason, setRejectionReason] = useState("");

    const fetchRequests = async () => {
        const { data, error } = await supabase
            .from("verification_requests")
            .select(`
                *,
                user:user_profile(id, display_name, avatar_url)
            `)
            .order("created_at", { ascending: false });
        
        if (error) {
            console.error("Error fetching requests:", error);
            // alert("Error fetching data: " + error.message); // Optional: alert for visibility
        }
        if (data) setRequests(data);
    };

    const handleAction = async (requestId: string, userId: string, action: "approve" | "reject", reason?: string) => {
        // Confirmation is now handled by ConfirmModal before calling this
        
        const updatePayload: any = { status: action === "approve" ? "approved" : "rejected" };
        if (action === "reject" && reason) {
            updatePayload.rejection_reason = reason;
        }

        // Update request status
        const { error: reqError } = await supabase
            .from("verification_requests")
            .update(updatePayload)
            .eq("id", requestId);

        if (reqError) {
            alert("Failed to update request");
            return;
        }

        // Check if verified column exists by trying to update it
        // If Approved, update user_profile verified = true
        if (action === "approve") {
            const { error: profileError } = await supabase
                .from("user_profile")
                .update({ verified: true })
                .eq("id", userId);
            
            if (profileError) {
                console.error("Failed to update profile verification", profileError);
                alert("Request approved but failed to update user profile 'verified' status. Check if column exists.");
            }
        }
        
        // Reset local state if was rejecting
        setRejectingId(null);
        setRejectionReason("");
        setConfirmModal(prev => ({ ...prev, isOpen: false })); // Close modal

        // Refresh list
        fetchRequests();
    };

    const filteredRequests = requests.filter(r => r.status === activeTab);

    const statusLabels = {
        pending: "Menunggu",
        approved: "Disetujui",
        rejected: "Ditolak"
    };

    if (checkingAuth) return <div className="min-h-screen bg-gray-50"/>; // Blank screen while checking
    if (!authorized) return null;

    return (
        <div className="max-w-4xl mx-auto px-4 py-8">
            <h1 className="text-2xl font-bold mb-6">Permintaan Verifikasi</h1>

            <div className="flex gap-4 mb-6 border-b border-gray-200">
                {(["pending", "approved", "rejected"] as const).map(tab => (
                    <button
                        key={tab}
                        onClick={() => setActiveTab(tab)}
                        className={`pb-2 px-4 font-medium capitalize ${
                            activeTab === tab 
                                ? "border-b-2 border-black text-black" 
                                : "text-gray-500 hover:text-gray-700"
                        }`}
                    >
                        {statusLabels[tab]} ({requests.filter(r => r.status === tab).length})
                    </button>
                ))}
            </div>

            <div className="space-y-4">
                {filteredRequests.length === 0 ? (
                    <p className="text-gray-500 italic py-8 text-center">Tidak ada permintaan {statusLabels[activeTab].toLowerCase()}.</p>
                ) : (
                    filteredRequests.map((req) => (
                        <div key={req.id} className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
                            <div className="flex items-start justify-between gap-4">
                                <div className="flex gap-4">
                                    <div className="w-12 h-12 bg-gray-200 rounded-full relative overflow-hidden shrink-0">
                                        {req.user?.avatar_url ? (
                                            <Image src={req.user.avatar_url} alt={req.user.display_name} fill className="object-cover" />
                                        ) : (
                                            <div className="w-full h-full bg-gray-300" />
                                        )}
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <h3 className="font-bold text-lg">{req.title}</h3>
                                            <Link href={`/profile/${req.user_id}`} className="text-xs bg-gray-100 px-2 py-0.5 rounded text-gray-600 hover:bg-gray-200">
                                                Lihat Profil
                                            </Link>
                                        </div>
                                        <p className="text-sm font-medium text-gray-900 mb-1">{req.user?.display_name}</p>
                                        <p className="text-gray-600 text-sm mt-2 whitespace-pre-wrap">{req.description}</p>
                                        <div className="flex gap-4 mt-2 text-xs text-gray-400">
                                            <span>Diajukan: {new Date(req.created_at).toLocaleString('id-ID')}</span>
                                            {req.terms_accepted && (
                                                <span className="text-green-600 font-medium flex items-center gap-1">
                                                    <Check size={12} /> Syarat Disetujui
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {req.status === "pending" && (
                                    <div className="flex gap-2">
                                        {rejectingId === req.id ? (
                                            <div className="flex flex-col gap-2 w-full md:w-64 animate-in fade-in zoom-in-95 duration-200">
                                                <textarea
                                                    value={rejectionReason}
                                                    onChange={(e) => setRejectionReason(e.target.value)}
                                                    placeholder="Alasan penolakan..."
                                                    className="w-full text-sm p-2 border border-gray-300 rounded focus:outline-none focus:border-red-500"
                                                    rows={2}
                                                    autoFocus
                                                />
                                                <div className="flex justify-end gap-2">
                                                    <button 
                                                        onClick={() => {
                                                            setRejectingId(null);
                                                            setRejectionReason("");
                                                        }}
                                                        className="px-3 py-1 text-xs text-gray-500 hover:bg-gray-100 rounded"
                                                    >
                                                        Batal
                                                    </button>
                                                    <button 
                                                        onClick={() => {
                                                            setConfirmModal({
                                                                isOpen: true,
                                                                title: "Tolak Verifikasi",
                                                                message: "Apakah Anda yakin ingin menolak permintaan verifikasi ini? User akan menerima notifikasi alasan penolakan.",
                                                                confirmLabel: "Tolak Permintaan",
                                                                isDanger: true,
                                                                onConfirm: () => handleAction(req.id, req.user_id, "reject", rejectionReason)
                                                            });
                                                        }}
                                                        disabled={!rejectionReason.trim()}
                                                        className="px-3 py-1 text-xs bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50"
                                                    >
                                                        Kirim Penolakan
                                                    </button>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="flex flex-col gap-2 shrink-0">
                                                <button 
                                                    onClick={() => {
                                                        setConfirmModal({
                                                            isOpen: true,
                                                            title: "Setujui Verifikasi",
                                                            message: "Apakah Anda yakin ingin menyetujui permintaan verifikasi ini? User akan mendapatkan badge verifikasi.",
                                                            confirmLabel: "Setujui Permintaan",
                                                            isDanger: false,
                                                            onConfirm: () => handleAction(req.id, req.user_id, "approve")
                                                        });
                                                    }}
                                                    className="bg-green-700 text-white px-4 py-2 rounded text-sm font-bold cursor-pointer hover:bg-green-800 flex items-center justify-center gap-2"
                                                >
                                                    <Check size={16} /> Setujui
                                                </button>
                                                <button 
                                                    onClick={() => {
                                                        setRejectingId(req.id);
                                                        setRejectionReason("");
                                                    }}
                                                    className="text-white bg-red-600 px-4 py-2 rounded text-sm font-bold cursor-pointer hover:bg-red-700 flex items-center justify-center gap-2"
                                                >
                                                    <X size={16} /> Tolak
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                )}
                                {req.status !== "pending" && (
                                    <div className="flex flex-col items-end">
                                        <span className={`px-3 py-1 rounded-full text-xs font-bold capitalize ${
                                            req.status === "approved" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
                                        }`}>
                                            {statusLabels[req.status as keyof typeof statusLabels]}
                                        </span>
                                        {req.status === "rejected" && req.rejection_reason && (
                                            <span className="text-xs text-gray-500 mt-1 max-w-[150px] text-right truncate" title={req.rejection_reason}>
                                                "{req.rejection_reason}"
                                            </span>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    ))
                )}
            </div>

            <ConfirmModal 
                isOpen={confirmModal.isOpen}
                onClose={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
                onConfirm={confirmModal.onConfirm}
                title={confirmModal.title}
                message={confirmModal.message}
                confirmLabel={confirmModal.confirmLabel}
                isDanger={confirmModal.isDanger}
            />
        </div>
    );
}
