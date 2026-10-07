"use client";
import { useCatalogue } from "./catalogue-provider";
export function Announcement() {
  const {getSettings} = useCatalogue();
  const settings = getSettings();
  if (!settings.announcement_enabled || !settings.announcement_text) return null;
  const link = settings.announcement_link;
  const safeLink = (link.startsWith("/") && !link.startsWith("//")) || /^https:\/\//.test(link);
  return <div className="store-announcement mono">{safeLink ? <a href={link}>{settings.announcement_text}</a> : settings.announcement_text}</div>;
}
