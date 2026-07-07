import { redirect } from "next/navigation";

export default function OrgRoot({ params }: { params: { orgSlug: string } }) {
  // The org root resolves to the Overview — the console's home surface under
  // every profile.
  redirect(`/orgs/${params.orgSlug}/overview`);
}
