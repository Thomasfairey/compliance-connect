"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import {
  Loader2,
  Building2,
  MapPin,
  Pencil,
  Trash2,
  ClipboardList,
} from "lucide-react";
import { PageHeader, PageLoading } from "@/components/shared";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { siteSchema, type SiteFormData } from "@/lib/validations";
import { getSiteById, updateSite, deleteSite } from "@/lib/actions";
import type { Site } from "@prisma/client";

export default function SiteDetailPage() {
  const router = useRouter();
  const params = useParams();
  const siteId = params.id as string;

  const [site, setSite] = useState<Site | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const form = useForm<SiteFormData>({
    resolver: zodResolver(siteSchema),
    defaultValues: {
      name: "",
      address: "",
      postcode: "",
      accessNotes: "",
    },
  });

  useEffect(() => {
    async function loadSite() {
      try {
        const data = await getSiteById(siteId);
        if (data) {
          setSite(data);
          form.reset({
            name: data.name,
            address: data.address,
            postcode: data.postcode,
            accessNotes: data.accessNotes || "",
          });
        } else {
          toast.error("Site not found");
          router.push("/sites");
        }
      } catch {
        toast.error("Failed to load site");
        router.push("/sites");
      } finally {
        setLoading(false);
      }
    }
    loadSite();
  }, [siteId, router, form]);

  async function onSubmit(data: SiteFormData) {
    setSaving(true);
    try {
      const result = await updateSite(siteId, data);
      if (result.success && result.data) {
        setSite(result.data);
        setEditing(false);
        toast.success("Site updated successfully!");
      } else {
        toast.error(result.error || "Failed to update site");
      }
    } catch {
      toast.error("An error occurred");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    setDeleting(true);
    try {
      const result = await deleteSite(siteId);
      if (result.success) {
        toast.success("Site deleted successfully!");
        router.push("/sites");
      } else {
        toast.error(result.error || "Failed to delete site");
      }
    } catch {
      toast.error("An error occurred");
    } finally {
      setDeleting(false);
    }
  }

  function handleCancel() {
    if (site) {
      form.reset({
        name: site.name,
        address: site.address,
        postcode: site.postcode,
        accessNotes: site.accessNotes || "",
      });
    }
    setEditing(false);
  }

  if (loading) {
    return <PageLoading />;
  }

  if (!site) {
    return null;
  }

  return (
    <div>
      <PageHeader
        title={site.name}
        description="View and manage site details."
        backHref="/sites"
        action={
          !editing && (
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setEditing(true)}>
                <Pencil className="h-4 w-4 mr-2" />
                Edit
              </Button>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" disabled={deleting}>
                    {deleting ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Trash2 className="h-4 w-4" />
                    )}
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete Site</AlertDialogTitle>
                    <AlertDialogDescription>
                      Are you sure you want to delete this site? This action
                      cannot be undone and will also delete all associated
                      bookings.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={handleDelete}
                      className="bg-red-600 hover:bg-red-700"
                    >
                      Delete
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          )
        }
      />

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                Site Details
              </CardTitle>
            </CardHeader>
            <CardContent>
              {editing ? (
                <Form {...form}>
                  <form
                    onSubmit={form.handleSubmit(onSubmit)}
                    className="space-y-6"
                  >
                    <FormField
                      control={form.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Site Name</FormLabel>
                          <FormControl>
                            <Input placeholder="e.g., London HQ" {...field} />
                          </FormControl>
                          <FormDescription>
                            A friendly name to identify this location
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="address"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Address</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="e.g., 123 Main Street, London"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="postcode"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Postcode</FormLabel>
                          <FormControl>
                            <Input placeholder="e.g., SW1A 1AA" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="accessNotes"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Access Notes (Optional)</FormLabel>
                          <FormControl>
                            <Textarea
                              placeholder="e.g., Ring bell at reception, parking available at rear"
                              {...field}
                            />
                          </FormControl>
                          <FormDescription>
                            Any instructions for engineers visiting this site
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="flex gap-4">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={handleCancel}
                        disabled={saving}
                      >
                        Cancel
                      </Button>
                      <Button type="submit" disabled={saving}>
                        {saving && (
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        )}
                        Save Changes
                      </Button>
                    </div>
                  </form>
                </Form>
              ) : (
                <div className="space-y-6">
                  <div>
                    <h3 className="text-sm font-medium text-gray-500 mb-1">
                      Site Name
                    </h3>
                    <p className="text-gray-900">{site.name}</p>
                  </div>

                  <div>
                    <h3 className="text-sm font-medium text-gray-500 mb-1">
                      Address
                    </h3>
                    <div className="flex items-start gap-2">
                      <MapPin className="h-4 w-4 mt-1 text-gray-400" />
                      <div>
                        <p className="text-gray-900">{site.address}</p>
                        <p className="text-gray-900">{site.postcode}</p>
                      </div>
                    </div>
                  </div>

                  {site.accessNotes && (
                    <div>
                      <h3 className="text-sm font-medium text-gray-500 mb-1">
                        Access Notes
                      </h3>
                      <p className="text-gray-900">{site.accessNotes}</p>
                    </div>
                  )}

                  <div>
                    <h3 className="text-sm font-medium text-gray-500 mb-1">
                      Created
                    </h3>
                    <p className="text-gray-900">
                      {new Date(site.createdAt).toLocaleDateString("en-GB", {
                        day: "numeric",
                        month: "long",
                        year: "numeric",
                      })}
                    </p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ClipboardList className="h-5 w-5" />
                Quick Actions
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button
                className="w-full justify-start"
                variant="outline"
                onClick={() =>
                  router.push(`/bookings/new?siteId=${site.id}`)
                }
              >
                <ClipboardList className="h-4 w-4 mr-2" />
                Book a Test
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
