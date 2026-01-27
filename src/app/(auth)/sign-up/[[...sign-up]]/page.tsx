import { SignUp } from "@clerk/nextjs";

export default function SignUpPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <SignUp
        appearance={{
          elements: {
            rootBox: "mx-auto",
            card: "shadow-xl border border-gray-100",
            headerTitle: "text-2xl font-bold",
            headerSubtitle: "text-gray-600",
            socialButtonsBlockButton:
              "border border-gray-200 hover:bg-gray-50 transition-colors",
            formButtonPrimary:
              "bg-black hover:bg-gray-800 text-white transition-colors",
            footerActionLink: "text-black hover:text-gray-600",
          },
        }}
        afterSignUpUrl="/dashboard"
        signInUrl="/sign-in"
      />
    </div>
  );
}
