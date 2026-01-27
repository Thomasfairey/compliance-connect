import { Loader2, Shield } from "lucide-react";

export default function RootLoading() {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center">
      <div className="text-center">
        <div className="w-16 h-16 bg-black rounded-2xl flex items-center justify-center mx-auto mb-6">
          <Shield className="w-8 h-8 text-white" />
        </div>
        <Loader2 className="h-8 w-8 animate-spin text-gray-400 mx-auto" />
      </div>
    </div>
  );
}
