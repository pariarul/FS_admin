"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

import {
  ChevronDown,
  Home,
  Truck,
  Building2,
  User,
  Clock,
  Box,
  Shield,
  FileText,
  Users,
  BookOpenCheck,
  FileEditIcon,
  Globe,
  LogOut,
} from "lucide-react";

/* -------------------------------------------- */
/* Helper type for icons (fixes hydration issue) */
/* -------------------------------------------- */
interface SubLink {
  title: string;
  href: string;
}

interface SidebarItem {
  title: string;
  icon: () => React.ReactNode;
  href?: string;
  subLinks?: SubLink[];
}

/* -------------------------------------------- */
/* Sidebar Items List                           */
/* -------------------------------------------- */
const sidebarItems: SidebarItem[] = [
  {
    title: "Home",
    icon: () => <Home className="w-4 h-4" />,
    subLinks: [
      { title: "Hero Section", href: "/dashboard/home/hero" },
      { title: "About Section", href: "/dashboard/home/about" },
      { title: "Leadership", href: "/dashboard/home/leadership" },
      { title: "Suppliers", href: "/dashboard/home/suppliers" },
      { title: "Products", href: "/dashboard/home/products" },
      { title: "CTA Section", href: "/dashboard/home/cta" },
    ],
  },
  { title: "Suppliers", icon: () => <Truck className="w-4 h-4" />, href: "/dashboard/suppliers" },
  { title: "Company", icon: () => <Building2 className="w-4 h-4" />, href: "/dashboard/company" },
  { title: "Leadership", icon: () => <User className="w-4 h-4" />, href: "/dashboard/leadership" },
  { title: "History", icon: () => <Clock className="w-4 h-4" />, href: "/dashboard/history" },
  {
    title: "Products",
    icon: () => <Box className="w-4 h-4" />,
    subLinks: [
      { title: "Import Products", href: "/dashboard/products/import" },
      { title: "Export Products", href: "/dashboard/products/export" },
    ],
  },
  {
    title: "Privacy Policy",
    icon: () => <Shield className="w-4 h-4" />,
    href: "/dashboard/privacy-policy",
  },
  {
    title: "Terms & Conditions",
    icon: () => <FileText className="w-4 h-4" />,
    href: "/dashboard/terms-and-conditions",
  },
  { title: "Sub Admins", icon: () => <Users className="w-4 h-4" />, href: "/dashboard/sub-admins" },
  {
    title: "Suppliers Contacts",
    icon: () => <BookOpenCheck className="w-4 h-4" />,
    href: "/dashboard/supplier-forms",
  },
  { title: "Footer", icon: () => <FileEditIcon className="w-4 h-4" />, href: "/dashboard/footer" },
   
  {
    title: "SEO Contents",
    icon: () => <Globe className="w-4 h-4" />, href: "/dashboard/seo-contents",

  },
];

/* ---------------------------------------------------------- */
/* Sidebar Component                                           */
/* ---------------------------------------------------------- */
export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();

  const [openSubmenus, setOpenSubmenus] = useState<Record<string, boolean>>({});

  /* -------------------------------------------- */
  /* Session validation (localStorage + cookies)   */
  /* -------------------------------------------- */
  useEffect(() => {
    const token = localStorage.getItem("fs_admin_token");


    if (!token ) {
      router.push("/");
    }
  }, [router]);

  /* -------------------------------------------- */
  /* Auto-open submenu if current path is inside it */
  /* -------------------------------------------- */
  useEffect(() => {
    sidebarItems.forEach((item) => {
      if (item.subLinks) {
        const match = item.subLinks.some((sub) => sub.href === pathname);
        if (match) {
          setOpenSubmenus((prev) => ({ ...prev, [item.title]: true }));
        }
      }
    });
  }, [pathname]);

  /* -------------------------------------------- */
  /* Toggle submenus                              */
  /* -------------------------------------------- */
  const toggleSubmenu = (title: string) => {
    setOpenSubmenus((prev) => ({ ...prev, [title]: !prev[title] }));
  };

  /* -------------------------------------------- */
  /* Smooth scroll for same-page anchor links      */
  /* -------------------------------------------- */
  const handleLinkClick = (e: React.MouseEvent, href: string) => {
    const currentPage = pathname.split("/")[2];
    const targetPage = href.split("/")[2];

    if (currentPage === targetPage) {
      const elementId = href.split("/").pop() || "";

      const el = document.getElementById(elementId);
      if (el) {
        e.preventDefault();
        el.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    }
  };

  /* -------------------------------------------- */
  /* Handle logout                                */
  /* -------------------------------------------- */
  const handleLogout = () => {
    localStorage.removeItem("fs_admin_token");
    router.push("/");
  };

  return (
    <div className="h-screen w-64 flex flex-col bg-white border-r border-gray-200 overflow-hidden">
      {/* Fixed Header */}
      <div className="p-4 border-b border-gray-200 flex-shrink-0">
        <h2 className="text-xl font-bold text-gray-800">Dashboard</h2>
      </div>

      {/* Scrollable Navigation */}
      <nav className="flex-1 overflow-y-auto mt-4">
        {sidebarItems.map((item) => {
          const active =
            item.href === pathname ||
            (item.subLinks?.some((s) => s.href === pathname) ?? false);

          const isOpen = openSubmenus[item.title];

          return (
            <div key={item.title} className="mb-1">
              {/* Parent with Submenu */}
              {item.subLinks ? (
                <button
                  onClick={() => toggleSubmenu(item.title)}
                  className={`flex w-full items-center justify-between px-4 py-2.5 rounded-lg text-sm font-medium transition ${active ? "bg-primary text-white" : "text-gray-700 hover:bg-primary hover:text-white"
                    }`}
                >
                  <div className="flex items-center gap-3">
                    {item.icon()}
                    {item.title}
                  </div>
                  <ChevronDown
                    className={`h-4 w-4 transition-transform ${isOpen ? "rotate-180" : ""}`}
                  />
                </button>
              ) : (
                /* Simple Link */
                <Link
                  href={item.href!}
                  onClick={(e) => handleLinkClick(e, item.href!)}
                  className={`flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition ${active ? "bg-primary text-white" : "text-gray-700 hover:bg-primary hover:text-white"
                    }`}
                >
                  {item.icon()}
                  {item.title}
                </Link>
              )}

              {/* Submenu */}
              {item.subLinks && (
                <div
                  className={`transition-all overflow-hidden ${isOpen ? "max-h-96 opacity-100" : "max-h-0 opacity-0"
                    }`}
                >
                  <div className="ml-9 mt-1 border-l-2 border-gray-200 pl-4 space-y-1">
                    {item.subLinks.map((sub) => {
                      const isSubActive = sub.href === pathname;
                      return (
                        <Link
                          key={sub.href}
                          href={sub.href}
                          onClick={(e) => handleLinkClick(e, sub.href)}
                          className={`block px-3 py-1.5 text-sm rounded-md transition truncate ${isSubActive
                              ? "bg-primary text-white"
                              : "text-gray-600 hover:bg-primary hover:text-white"
                            }`}
                        >
                          {sub.title}
                        </Link>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </nav>

      {/* Fixed Footer with Logout */}
      <div className="p-4 border-t border-gray-200 flex-shrink-0">
        <button
          onClick={handleLogout}
          className="flex w-full items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium bg-red-50 text-red-600 hover:bg-red-100 transition"
        >
          <LogOut className="w-4 h-4" />
          Logout
        </button>
      </div>
    </div>
  );
}