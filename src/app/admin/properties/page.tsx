import { prisma } from "@/lib/prisma";
import Link from "next/link";
import DeleteButton from "@/components/admin/DeleteButton";

export const dynamic = "force-dynamic";

export default async function PropertiesPage() {
  const properties = await prisma.property.findMany({ orderBy: { createdAt: "desc" } });

  return (
    <div className="p-6 lg:p-10 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="font-serif font-semibold text-charcoal text-[1.8rem]">Properties</h1>
          <p className="text-charcoal/45 text-[14px] mt-1">{properties.length} listing{properties.length !== 1 ? "s" : ""}</p>
        </div>
        <Link
          href="/admin/properties/new"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-[13px] font-semibold text-white"
          style={{ background: "linear-gradient(135deg,#C4A862,#A8893F)" }}
        >
          <i className="fa-solid fa-plus" /> Add Property
        </Link>
      </div>

      <div className="bg-white rounded-[16px] shadow-[0_2px_12px_rgba(44,44,44,.07)] border border-black/[.04] overflow-hidden">
        {properties.length === 0 ? (
          <div className="py-20 text-center">
            <i className="fa-solid fa-house text-charcoal/20 text-[3rem] mb-4 block" />
            <p className="text-charcoal/40 text-[15px]">No properties yet.</p>
            <Link href="/admin/properties/new" className="inline-block mt-4 text-forest font-semibold text-[14px] hover:underline">Add your first property →</Link>
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-black/[.06] bg-[#F8F9FA]">
                {["Property", "Type", "Price/Night", "Status", "Featured", "Actions"].map((h) => (
                  <th key={h} className="text-left px-5 py-3.5 text-[11px] font-semibold text-charcoal/50 uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-black/[.05]">
              {properties.map((p) => (
                <tr key={p.id} className="hover:bg-[#FAFAFA] transition-colors">
                  <td className="px-5 py-4">
                    <div className="font-medium text-charcoal text-[14px]">{p.name}</div>
                    <div className="text-charcoal/40 text-[12px]">{p.location}</div>
                  </td>
                  <td className="px-5 py-4 text-[13px] text-charcoal/70">{p.type}</td>
                  <td className="px-5 py-4 text-[13px] font-semibold text-charcoal">₱{Number(p.pricePerNight).toLocaleString()}</td>
                  <td className="px-5 py-4">
                    <span className={`text-[11px] font-semibold px-2.5 py-1 rounded-full ${p.isActive ? "bg-green-100 text-green-700" : "bg-red-100 text-red-600"}`}>
                      {p.isActive ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td className="px-5 py-4">
                    <span className={`text-[11px] font-semibold px-2.5 py-1 rounded-full ${p.isFeatured ? "bg-[#C4A862]/15 text-[#A8893F]" : "bg-black/5 text-charcoal/40"}`}>
                      {p.isFeatured ? "Featured" : "—"}
                    </span>
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-2">
                      <Link href={`/admin/properties/${p.id}`} className="text-[12px] font-semibold text-forest hover:underline">Edit</Link>
                      <span className="text-charcoal/20">|</span>
                      <DeleteButton id={p.id} type="property" />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
