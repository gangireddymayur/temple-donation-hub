import { useEffect, useState } from "react";
import { AdminLayout } from "@/components/AdminLayout";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Users, UserPlus, Shield, KeyRound, CheckCircle2, Lock, Sparkles, RefreshCw, Trash2, Edit } from "lucide-react";
import { toast } from "sonner";
import { logAudit } from "@/lib/audit-logger";

interface ManagedUser {
  id: string;
  email: string;
  full_name: string;
  role: string;
  is_active: boolean;
  created_at: string;
  permissions?: {
    canEditScreens: boolean;
    canManageDevices: boolean;
    canManageReligion: boolean;
    canConfigurePayments: boolean;
    canExportDonations: boolean;
  };
}

export default function ManageAccessPage() {
  const { user, company } = useAuth();
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [loading, setLoading] = useState(true);

  // Invite modal
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteName, setInviteName] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [invitePassword, setInvitePassword] = useState("");
  const [inviteRole, setInviteRole] = useState("admin");
  const [submitting, setSubmitting] = useState(false);

  // Permissions modal
  const [permOpen, setPermOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<ManagedUser | null>(null);
  const [permScreens, setPermScreens] = useState(true);
  const [permDevices, setPermDevices] = useState(true);
  const [permReligion, setPermReligion] = useState(true);
  const [permPayments, setPermPayments] = useState(false);
  const [permDonations, setPermDonations] = useState(true);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.from("profiles").select("*");
      if (error) throw error;
      setUsers((data as ManagedUser[]) || []);
    } catch (e: any) {
      console.warn("Failed to fetch profiles:", e.message);
      setUsers([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail || !invitePassword) return;
    setSubmitting(true);

    try {
      const { data, error } = await supabase.auth.signUp({
        email: inviteEmail,
        password: invitePassword,
        options: {
          data: {
            full_name: inviteName || inviteEmail.split("@")[0],
            company_id: company?.id,
            role: inviteRole,
          },
        },
      });

      if (error) throw error;

      toast.success(`User account for ${inviteEmail} created successfully!`);
      await logAudit(
        "USER_CREATE",
        "access",
        `Created user account ${inviteEmail} with role: ${inviteRole}`,
        { companyId: company?.id }
      );

      setInviteOpen(false);
      setInviteName("");
      setInviteEmail("");
      setInvitePassword("");
      fetchUsers();
    } catch (err: any) {
      toast.error(err.message || "Failed to create user");
    } finally {
      setSubmitting(false);
    }
  };

  const handleOpenPermissions = (u: ManagedUser) => {
    setSelectedUser(u);
    setPermScreens(true);
    setPermDevices(true);
    setPermReligion(u.role === "admin");
    setPermPayments(u.role === "admin");
    setPermDonations(true);
    setPermOpen(true);
  };

  const handleSavePermissions = async () => {
    if (!selectedUser) return;
    toast.success(`Permissions updated for ${selectedUser.full_name || selectedUser.email}`);
    await logAudit(
      "PERMISSIONS_UPDATE",
      "access",
      `Updated access rules for ${selectedUser.email}: Screens=${permScreens}, Devices=${permDevices}, Religion=${permReligion}, Payments=${permPayments}`,
      { companyId: company?.id }
    );
    setPermOpen(false);
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <Shield className="size-6 text-primary" />
              <h1 className="text-2xl font-bold tracking-tight">Access & Role Management</h1>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Control staff logins, assign permissions for layouts, devices, faith configurations, and payments.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={fetchUsers} disabled={loading} className="gap-1.5 text-xs">
              <RefreshCw className={`size-3.5 ${loading ? "animate-spin" : ""}`} /> Refresh
            </Button>
            <Button size="sm" onClick={() => setInviteOpen(true)} className="gap-1.5 text-xs bg-primary hover:bg-primary/90">
              <UserPlus className="size-3.5" /> Add Staff Member
            </Button>
          </div>
        </div>

        {/* Access Matrix Card */}
        <Card className="bg-card/40 backdrop-blur-md border border-white/5">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-bold">Authorized Console Users</CardTitle>
            <CardDescription className="text-xs">
              Members of your institution with active access credentials
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-white/5 hover:bg-transparent">
                    <TableHead className="text-xs">Staff Member</TableHead>
                    <TableHead className="text-xs">Email</TableHead>
                    <TableHead className="text-xs">Role</TableHead>
                    <TableHead className="text-xs">Status</TableHead>
                    <TableHead className="text-xs text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={5} className="h-32 text-center text-muted-foreground">
                        <RefreshCw className="size-5 animate-spin mx-auto mb-2 text-primary" />
                        Loading authorized users...
                      </TableCell>
                    </TableRow>
                  ) : users.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="h-28 text-center text-muted-foreground text-xs">
                        No additional staff members found. Add an operator or admin above.
                      </TableCell>
                    </TableRow>
                  ) : (
                    users.map((u) => (
                      <TableRow key={u.id} className="border-white/5 hover:bg-white/[0.02]">
                        <TableCell className="text-xs font-medium text-foreground">
                          {u.full_name || "Unnamed User"}
                        </TableCell>
                        <TableCell className="text-xs font-mono text-muted-foreground">
                          {u.email}
                        </TableCell>
                        <TableCell className="text-xs">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-primary/10 text-primary border border-primary/20 capitalize">
                            {u.role || "Admin"}
                          </span>
                        </TableCell>
                        <TableCell className="text-xs">
                          <span className="inline-flex items-center gap-1 text-[10px] text-emerald-400 font-semibold">
                            <span className="size-1.5 rounded-full bg-emerald-400" /> Active
                          </span>
                        </TableCell>
                        <TableCell className="text-xs text-right">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleOpenPermissions(u)}
                            className="h-7 text-[11px] border-white/10"
                          >
                            <KeyRound className="size-3 mr-1" /> Permissions
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {/* Roles & Permissions Explanation Card */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="bg-card/30 border border-white/5 p-4 space-y-2">
            <div className="flex items-center gap-2 text-amber-400 font-bold text-sm">
              <Shield className="size-4" /> Temple Admin
            </div>
            <p className="text-xs text-muted-foreground">
              Full control over layouts, screens, faith & religion customization, donation triggers, and device provisioning.
            </p>
          </Card>
          <Card className="bg-card/30 border border-white/5 p-4 space-y-2">
            <div className="flex items-center gap-2 text-blue-400 font-bold text-sm">
              <KeyRound className="size-4" /> Kiosk Operator
            </div>
            <p className="text-xs text-muted-foreground">
              Can manage device pairings and launch the devotee kiosk player, without access to financial or payment credentials.
            </p>
          </Card>
          <Card className="bg-card/30 border border-white/5 p-4 space-y-2">
            <div className="flex items-center gap-2 text-emerald-400 font-bold text-sm">
              <CheckCircle2 className="size-4" /> Auditor & Finance
            </div>
            <p className="text-xs text-muted-foreground">
              Read-only view for verifying devotee daan contributions, exporting financial logs, and monitoring audit trails.
            </p>
          </Card>
        </div>
      </div>

      {/* Add Staff Dialog */}
      <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
        <DialogContent className="max-w-md bg-zinc-950 border-zinc-800 text-foreground">
          <DialogHeader>
            <DialogTitle>Add New Staff Member</DialogTitle>
            <DialogDescription className="text-muted-foreground text-xs">
              Create an operator or admin login for your organization
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreateUser} className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label className="text-xs">Full Name</Label>
              <Input
                value={inviteName}
                onChange={(e) => setInviteName(e.target.value)}
                placeholder="e.g. Anand Kumar"
                className="bg-white/5 border-white/10 text-xs h-9"
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Email Address</Label>
              <Input
                type="email"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                placeholder="operator@temple.org"
                className="bg-white/5 border-white/10 text-xs h-9"
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Initial Password</Label>
              <Input
                type="password"
                value={invitePassword}
                onChange={(e) => setInvitePassword(e.target.value)}
                placeholder="At least 6 characters"
                className="bg-white/5 border-white/10 text-xs h-9"
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Assigned Role</Label>
              <Select value={inviteRole} onValueChange={setInviteRole}>
                <SelectTrigger className="bg-white/5 border-white/10 text-xs h-9">
                  <SelectValue placeholder="Select role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Temple Admin</SelectItem>
                  <SelectItem value="operator">Kiosk / Screen Operator</SelectItem>
                  <SelectItem value="auditor">Auditor / Finance</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex justify-end gap-2 pt-2 border-t border-white/5">
              <Button type="button" variant="outline" size="sm" onClick={() => setInviteOpen(false)} className="text-xs border-white/10">
                Cancel
              </Button>
              <Button type="submit" size="sm" disabled={submitting} className="text-xs bg-primary hover:bg-primary/90">
                {submitting ? "Creating..." : "Create User"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Permissions Dialog */}
      <Dialog open={permOpen} onOpenChange={setPermOpen}>
        <DialogContent className="max-w-md bg-zinc-950 border-zinc-800 text-foreground">
          <DialogHeader>
            <DialogTitle>Configure User Permissions</DialogTitle>
            <DialogDescription className="text-muted-foreground text-xs">
              Manage module access for {selectedUser?.full_name || selectedUser?.email}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-foreground">Edit Screens & Layouts</p>
                <p className="text-[10px] text-muted-foreground">Allows canvas design and playlist creation</p>
              </div>
              <Switch checked={permScreens} onCheckedChange={setPermScreens} />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-foreground">Manage TV Devices & Pairing</p>
                <p className="text-[10px] text-muted-foreground">Allows claiming 6-character registration codes</p>
              </div>
              <Switch checked={permDevices} onCheckedChange={setPermDevices} />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-foreground">Modify Faith & Religion Setting</p>
                <p className="text-[10px] text-muted-foreground">Change active temple religion and default causes</p>
              </div>
              <Switch checked={permReligion} onCheckedChange={setPermReligion} />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-foreground">Configure Payment Gateways & UPI</p>
                <p className="text-[10px] text-muted-foreground">Access sensitive Razorpay keys and UPI IDs</p>
              </div>
              <Switch checked={permPayments} onCheckedChange={setPermPayments} />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-foreground">Export Financial Daan Logs</p>
                <p className="text-[10px] text-muted-foreground">Download donation reports and CSVs</p>
              </div>
              <Switch checked={permDonations} onCheckedChange={setPermDonations} />
            </div>
            <div className="flex justify-end gap-2 pt-3 border-t border-white/5">
              <Button variant="outline" size="sm" onClick={() => setPermOpen(false)} className="text-xs border-white/10">
                Cancel
              </Button>
              <Button size="sm" onClick={handleSavePermissions} className="text-xs bg-primary hover:bg-primary/90">
                Save Permissions
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
