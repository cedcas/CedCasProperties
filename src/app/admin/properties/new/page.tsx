import PropertyForm from "@/components/admin/PropertyForm";

export default function NewPropertyPage() {
  return (
    <div className="p-6 lg:p-10 max-w-3xl mx-auto">
      <div className="mb-8">
        <h1 className="font-serif font-semibold text-charcoal text-[1.8rem]">Add Property</h1>
        <p className="text-charcoal/45 text-[14px] mt-1">Create a new rental listing.</p>
      </div>
      <PropertyForm />
    </div>
  );
}
