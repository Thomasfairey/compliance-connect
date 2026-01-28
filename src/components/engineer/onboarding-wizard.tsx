"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import {
  updateEngineerProfile,
  submitProfileForApproval,
  type EngineerProfileWithRelations,
} from "@/lib/actions/engineer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Shield,
  User,
  Award,
  Wrench,
  MapPin,
  CheckCircle2,
  ChevronRight,
  ChevronLeft,
  Plus,
  X,
  Clock,
  Loader2,
} from "lucide-react";
import type { Service } from "@prisma/client";

type Props = {
  profile: EngineerProfileWithRelations;
  services: Service[];
};

type Qualification = {
  name: string;
  issuingBody: string;
  certificateNumber: string;
};

type Competency = {
  serviceId: string;
  experienceYears: number;
  certified: boolean;
};

type CoverageArea = {
  postcodePrefix: string;
  radiusKm: number;
};

const COMMON_QUALIFICATIONS = [
  { name: "18th Edition (BS 7671)", issuingBody: "City & Guilds" },
  { name: "City & Guilds 2391 (Inspection & Testing)", issuingBody: "City & Guilds" },
  { name: "City & Guilds 2382 (18th Edition)", issuingBody: "City & Guilds" },
  { name: "PAT Testing Certification", issuingBody: "Various" },
  { name: "Fire Alarm BS 5839 Competency", issuingBody: "FIA" },
  { name: "Emergency Lighting BS 5266", issuingBody: "Various" },
  { name: "NICEIC Approved Contractor", issuingBody: "NICEIC" },
  { name: "ECS Card", issuingBody: "JIB" },
];

const STEPS = [
  { id: "welcome", title: "Welcome", icon: Shield },
  { id: "profile", title: "Profile", icon: User },
  { id: "qualifications", title: "Qualifications", icon: Award },
  { id: "services", title: "Services", icon: Wrench },
  { id: "coverage", title: "Coverage", icon: MapPin },
  { id: "review", title: "Review", icon: CheckCircle2 },
];

export function EngineerOnboardingWizard({ profile, services }: Props) {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(0);
  const [loading, setLoading] = useState(false);

  // Form state
  const [yearsExperience, setYearsExperience] = useState(profile.yearsExperience || 0);
  const [bio, setBio] = useState(profile.bio || "");
  const [dayRate, setDayRate] = useState(profile.dayRate || 250);
  const [phone, setPhone] = useState(profile.user.phone || "");

  const [qualifications, setQualifications] = useState<Qualification[]>(
    profile.qualifications.length > 0
      ? profile.qualifications.map((q) => ({
          name: q.name,
          issuingBody: q.issuingBody || "",
          certificateNumber: q.certificateNumber || "",
        }))
      : []
  );

  const [competencies, setCompetencies] = useState<Competency[]>(
    profile.competencies.length > 0
      ? profile.competencies.map((c) => ({
          serviceId: c.serviceId,
          experienceYears: c.experienceYears,
          certified: c.certified,
        }))
      : []
  );

  const [coverageAreas, setCoverageAreas] = useState<CoverageArea[]>(
    profile.coverageAreas.length > 0
      ? profile.coverageAreas.map((a) => ({
          postcodePrefix: a.postcodePrefix,
          radiusKm: a.radiusKm,
        }))
      : []
  );

  const [newPostcode, setNewPostcode] = useState("");

  const handleNext = async () => {
    if (currentStep < STEPS.length - 1) {
      // Save progress at each step
      if (currentStep > 0) {
        setLoading(true);
        try {
          await updateEngineerProfile({
            yearsExperience,
            bio,
            dayRate,
            qualifications,
            competencies,
            coverageAreas,
          });
        } catch {
          toast.error("Failed to save progress");
        }
        setLoading(false);
      }
      setCurrentStep((prev) => prev + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep((prev) => prev - 1);
    }
  };

  const handleSubmit = async () => {
    setLoading(true);
    try {
      // Final save
      await updateEngineerProfile({
        yearsExperience,
        bio,
        dayRate,
        qualifications,
        competencies,
        coverageAreas,
      });

      // Submit for approval
      const result = await submitProfileForApproval();

      if (result.success) {
        toast.success("Profile submitted for approval!");
        router.push("/engineer");
      } else {
        toast.error(result.error || "Failed to submit profile");
      }
    } catch {
      toast.error("Failed to submit profile");
    }
    setLoading(false);
  };

  const addQualification = (qual: { name: string; issuingBody: string }) => {
    if (!qualifications.find((q) => q.name === qual.name)) {
      setQualifications([...qualifications, { ...qual, certificateNumber: "" }]);
    }
  };

  const removeQualification = (index: number) => {
    setQualifications(qualifications.filter((_, i) => i !== index));
  };

  const toggleService = (serviceId: string) => {
    const exists = competencies.find((c) => c.serviceId === serviceId);
    if (exists) {
      setCompetencies(competencies.filter((c) => c.serviceId !== serviceId));
    } else {
      setCompetencies([...competencies, { serviceId, experienceYears: 1, certified: false }]);
    }
  };

  const addCoverageArea = () => {
    if (newPostcode && !coverageAreas.find((a) => a.postcodePrefix === newPostcode.toUpperCase())) {
      setCoverageAreas([...coverageAreas, { postcodePrefix: newPostcode.toUpperCase(), radiusKm: 20 }]);
      setNewPostcode("");
    }
  };

  const removeCoverageArea = (index: number) => {
    setCoverageAreas(coverageAreas.filter((_, i) => i !== index));
  };

  const isPendingApproval = profile.status === "PENDING_APPROVAL" && profile.qualifications.length > 0;

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/30">
      {/* Header */}
      <div className="border-b bg-background/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center">
                <Shield className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="font-semibold text-foreground">Engineer Onboarding</h1>
                <p className="text-sm text-muted-foreground">Complete your profile to get started</p>
              </div>
            </div>

            {/* Progress */}
            <div className="hidden md:flex items-center gap-2">
              {STEPS.map((step, index) => (
                <div key={step.id} className="flex items-center">
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${
                      index < currentStep
                        ? "gradient-primary text-white"
                        : index === currentStep
                        ? "bg-primary/10 text-primary border-2 border-primary"
                        : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {index < currentStep ? (
                      <CheckCircle2 className="w-4 h-4" />
                    ) : (
                      <step.icon className="w-4 h-4" />
                    )}
                  </div>
                  {index < STEPS.length - 1 && (
                    <div
                      className={`w-8 h-0.5 mx-1 transition-all ${
                        index < currentStep ? "bg-primary" : "bg-muted"
                      }`}
                    />
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-6 py-8">
        {isPendingApproval ? (
          <Card className="border-amber-200 bg-amber-50">
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center">
                  <Clock className="w-6 h-6 text-amber-600" />
                </div>
                <div>
                  <h2 className="text-xl font-semibold text-amber-900">Profile Under Review</h2>
                  <p className="text-amber-700">
                    Your profile has been submitted and is awaiting admin approval. We&apos;ll notify you once it&apos;s approved.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        ) : (
          <AnimatePresence mode="wait">
            <motion.div
              key={currentStep}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
            >
              {/* Step 0: Welcome */}
              {currentStep === 0 && (
                <Card>
                  <CardHeader className="text-center pb-2">
                    <div className="w-20 h-20 rounded-2xl gradient-primary flex items-center justify-center mx-auto mb-4">
                      <Wrench className="w-10 h-10 text-white" />
                    </div>
                    <CardTitle className="text-2xl">Welcome to Compliance Connect</CardTitle>
                    <CardDescription className="text-base">
                      Let&apos;s set up your engineer profile. This will help us match you with the right jobs in your area.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="pt-6">
                    <div className="grid md:grid-cols-3 gap-4 mb-8">
                      <div className="p-4 rounded-xl bg-muted/50 text-center">
                        <Award className="w-8 h-8 mx-auto mb-2 text-primary" />
                        <p className="font-medium">Add Qualifications</p>
                        <p className="text-sm text-muted-foreground">18th Edition, C&G 2391, etc.</p>
                      </div>
                      <div className="p-4 rounded-xl bg-muted/50 text-center">
                        <Wrench className="w-8 h-8 mx-auto mb-2 text-primary" />
                        <p className="font-medium">Select Services</p>
                        <p className="text-sm text-muted-foreground">PAT, Fire Alarms, etc.</p>
                      </div>
                      <div className="p-4 rounded-xl bg-muted/50 text-center">
                        <MapPin className="w-8 h-8 mx-auto mb-2 text-primary" />
                        <p className="font-medium">Set Coverage</p>
                        <p className="text-sm text-muted-foreground">Postcodes you cover</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Step 1: Profile */}
              {currentStep === 1 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <User className="w-5 h-5 text-primary" />
                      Basic Profile
                    </CardTitle>
                    <CardDescription>Tell us about yourself and your experience</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="grid md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <Label htmlFor="yearsExperience">Years of Experience</Label>
                        <Input
                          id="yearsExperience"
                          type="number"
                          min="0"
                          max="50"
                          value={yearsExperience}
                          onChange={(e) => setYearsExperience(parseInt(e.target.value) || 0)}
                          className="h-12"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="dayRate">Day Rate (£)</Label>
                        <Input
                          id="dayRate"
                          type="number"
                          min="100"
                          max="1000"
                          value={dayRate}
                          onChange={(e) => setDayRate(parseInt(e.target.value) || 250)}
                          className="h-12"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="phone">Phone Number</Label>
                      <Input
                        id="phone"
                        type="tel"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="+44 7700 900000"
                        className="h-12"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="bio">Professional Bio</Label>
                      <Textarea
                        id="bio"
                        value={bio}
                        onChange={(e) => setBio(e.target.value)}
                        placeholder="Tell customers about your experience and expertise..."
                        rows={4}
                      />
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Step 2: Qualifications */}
              {currentStep === 2 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Award className="w-5 h-5 text-primary" />
                      Qualifications & Certifications
                    </CardTitle>
                    <CardDescription>Add your professional qualifications</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {/* Quick add buttons */}
                    <div>
                      <p className="text-sm font-medium mb-3">Quick Add:</p>
                      <div className="flex flex-wrap gap-2">
                        {COMMON_QUALIFICATIONS.map((qual) => (
                          <button
                            key={qual.name}
                            onClick={() => addQualification(qual)}
                            disabled={qualifications.some((q) => q.name === qual.name)}
                            className={`px-3 py-1.5 rounded-full text-sm transition-all ${
                              qualifications.some((q) => q.name === qual.name)
                                ? "bg-primary text-white"
                                : "bg-muted hover:bg-muted/80 text-foreground"
                            }`}
                          >
                            {qualifications.some((q) => q.name === qual.name) ? (
                              <CheckCircle2 className="w-4 h-4 inline mr-1" />
                            ) : (
                              <Plus className="w-4 h-4 inline mr-1" />
                            )}
                            {qual.name}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Selected qualifications */}
                    {qualifications.length > 0 && (
                      <div className="space-y-3">
                        <p className="text-sm font-medium">Your Qualifications:</p>
                        {qualifications.map((qual, index) => (
                          <div
                            key={index}
                            className="p-4 rounded-xl border bg-card flex items-start justify-between gap-4"
                          >
                            <div className="flex-1">
                              <p className="font-medium">{qual.name}</p>
                              <p className="text-sm text-muted-foreground">{qual.issuingBody}</p>
                              <div className="mt-2">
                                <Input
                                  placeholder="Certificate Number (optional)"
                                  value={qual.certificateNumber}
                                  onChange={(e) => {
                                    const updated = [...qualifications];
                                    updated[index].certificateNumber = e.target.value;
                                    setQualifications(updated);
                                  }}
                                  className="h-9 text-sm"
                                />
                              </div>
                            </div>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => removeQualification(index)}
                              className="text-muted-foreground hover:text-destructive"
                            >
                              <X className="w-4 h-4" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}

                    {qualifications.length === 0 && (
                      <div className="text-center py-8 text-muted-foreground">
                        <Award className="w-12 h-12 mx-auto mb-3 opacity-50" />
                        <p>Click the buttons above to add your qualifications</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* Step 3: Services */}
              {currentStep === 3 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Wrench className="w-5 h-5 text-primary" />
                      Service Competencies
                    </CardTitle>
                    <CardDescription>Select the services you can perform</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid md:grid-cols-2 gap-4">
                      {services.map((service) => {
                        const isSelected = competencies.some((c) => c.serviceId === service.id);
                        return (
                          <button
                            key={service.id}
                            onClick={() => toggleService(service.id)}
                            className={`p-4 rounded-xl border text-left transition-all ${
                              isSelected
                                ? "border-primary bg-primary/5"
                                : "border-border hover:border-primary/50"
                            }`}
                          >
                            <div className="flex items-start justify-between">
                              <div>
                                <p className="font-medium">{service.name}</p>
                                <p className="text-sm text-muted-foreground mt-1">
                                  {service.description}
                                </p>
                              </div>
                              <div
                                className={`w-6 h-6 rounded-full flex items-center justify-center ${
                                  isSelected
                                    ? "gradient-primary text-white"
                                    : "border-2 border-muted"
                                }`}
                              >
                                {isSelected && <CheckCircle2 className="w-4 h-4" />}
                              </div>
                            </div>
                          </button>
                        );
                      })}
                    </div>

                    {services.length === 0 && (
                      <div className="text-center py-8 text-muted-foreground">
                        <Wrench className="w-12 h-12 mx-auto mb-3 opacity-50" />
                        <p>No services available</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* Step 4: Coverage */}
              {currentStep === 4 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <MapPin className="w-5 h-5 text-primary" />
                      Coverage Areas
                    </CardTitle>
                    <CardDescription>
                      Enter the postcode prefixes you cover (e.g., SW1, EC, W, SE)
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="flex gap-2">
                      <Input
                        placeholder="Enter postcode prefix (e.g., SW1)"
                        value={newPostcode}
                        onChange={(e) => setNewPostcode(e.target.value.toUpperCase())}
                        onKeyDown={(e) => e.key === "Enter" && addCoverageArea()}
                        className="h-12"
                      />
                      <Button onClick={addCoverageArea} className="h-12 px-6 gradient-primary">
                        <Plus className="w-4 h-4 mr-2" />
                        Add
                      </Button>
                    </div>

                    {coverageAreas.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {coverageAreas.map((area, index) => (
                          <Badge
                            key={index}
                            variant="secondary"
                            className="px-3 py-2 text-sm flex items-center gap-2"
                          >
                            <MapPin className="w-3 h-3" />
                            {area.postcodePrefix}
                            <button
                              onClick={() => removeCoverageArea(index)}
                              className="ml-1 hover:text-destructive"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </Badge>
                        ))}
                      </div>
                    )}

                    {coverageAreas.length === 0 && (
                      <div className="text-center py-8 text-muted-foreground">
                        <MapPin className="w-12 h-12 mx-auto mb-3 opacity-50" />
                        <p>Add postcode prefixes to define your coverage area</p>
                      </div>
                    )}

                    <div className="p-4 rounded-xl bg-muted/50">
                      <p className="text-sm text-muted-foreground">
                        <strong>Tip:</strong> Add all the postcode prefixes you&apos;re willing to travel to.
                        Jobs will be matched based on these areas.
                      </p>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Step 5: Review */}
              {currentStep === 5 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <CheckCircle2 className="w-5 h-5 text-primary" />
                      Review Your Profile
                    </CardTitle>
                    <CardDescription>
                      Review your information before submitting for approval
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {/* Profile Summary */}
                    <div className="p-4 rounded-xl border bg-card">
                      <h3 className="font-medium mb-3 flex items-center gap-2">
                        <User className="w-4 h-4 text-primary" />
                        Profile
                      </h3>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <p className="text-muted-foreground">Experience</p>
                          <p className="font-medium">{yearsExperience} years</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Day Rate</p>
                          <p className="font-medium">£{dayRate}</p>
                        </div>
                      </div>
                      {bio && (
                        <div className="mt-3">
                          <p className="text-muted-foreground text-sm">Bio</p>
                          <p className="text-sm">{bio}</p>
                        </div>
                      )}
                    </div>

                    {/* Qualifications Summary */}
                    <div className="p-4 rounded-xl border bg-card">
                      <h3 className="font-medium mb-3 flex items-center gap-2">
                        <Award className="w-4 h-4 text-primary" />
                        Qualifications ({qualifications.length})
                      </h3>
                      <div className="flex flex-wrap gap-2">
                        {qualifications.map((q, i) => (
                          <Badge key={i} variant="secondary">
                            {q.name}
                          </Badge>
                        ))}
                      </div>
                    </div>

                    {/* Services Summary */}
                    <div className="p-4 rounded-xl border bg-card">
                      <h3 className="font-medium mb-3 flex items-center gap-2">
                        <Wrench className="w-4 h-4 text-primary" />
                        Services ({competencies.length})
                      </h3>
                      <div className="flex flex-wrap gap-2">
                        {competencies.map((c) => {
                          const service = services.find((s) => s.id === c.serviceId);
                          return (
                            <Badge key={c.serviceId} variant="secondary">
                              {service?.name || c.serviceId}
                            </Badge>
                          );
                        })}
                      </div>
                    </div>

                    {/* Coverage Summary */}
                    <div className="p-4 rounded-xl border bg-card">
                      <h3 className="font-medium mb-3 flex items-center gap-2">
                        <MapPin className="w-4 h-4 text-primary" />
                        Coverage Areas ({coverageAreas.length})
                      </h3>
                      <div className="flex flex-wrap gap-2">
                        {coverageAreas.map((a, i) => (
                          <Badge key={i} variant="secondary">
                            {a.postcodePrefix}
                          </Badge>
                        ))}
                      </div>
                    </div>

                    {/* Validation warnings */}
                    {(qualifications.length === 0 || competencies.length === 0 || coverageAreas.length === 0) && (
                      <div className="p-4 rounded-xl bg-amber-50 border border-amber-200">
                        <p className="text-amber-800 font-medium mb-2">Please complete the following:</p>
                        <ul className="text-sm text-amber-700 space-y-1">
                          {qualifications.length === 0 && (
                            <li>• Add at least one qualification</li>
                          )}
                          {competencies.length === 0 && (
                            <li>• Select at least one service</li>
                          )}
                          {coverageAreas.length === 0 && (
                            <li>• Add at least one coverage area</li>
                          )}
                        </ul>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}
            </motion.div>
          </AnimatePresence>
        )}

        {/* Navigation */}
        {!isPendingApproval && (
          <div className="flex items-center justify-between mt-8">
            <Button
              variant="outline"
              onClick={handleBack}
              disabled={currentStep === 0 || loading}
              className="h-12 px-6"
            >
              <ChevronLeft className="w-4 h-4 mr-2" />
              Back
            </Button>

            {currentStep < STEPS.length - 1 ? (
              <Button
                onClick={handleNext}
                disabled={loading}
                className="h-12 px-6 gradient-primary text-white"
              >
                {loading ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : null}
                Continue
                <ChevronRight className="w-4 h-4 ml-2" />
              </Button>
            ) : (
              <Button
                onClick={handleSubmit}
                disabled={
                  loading ||
                  qualifications.length === 0 ||
                  competencies.length === 0 ||
                  coverageAreas.length === 0
                }
                className="h-12 px-6 gradient-primary text-white"
              >
                {loading ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <CheckCircle2 className="w-4 h-4 mr-2" />
                )}
                Submit for Approval
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
