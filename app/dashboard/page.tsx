"use client";

import Link from "next/link";
import {
  Home,
  Users,
  Package,
  FileText,
  Settings,
  Sparkles,
  ArrowRight,
} from "lucide-react";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

/* -------------------------------------------- */
/* FIXED TYPES for ICONS (no more JSX errors)   */
/* -------------------------------------------- */
interface CategoryLink {
  name: string;
  path: string;
}

interface Category {
  title: string;
  icon: React.ComponentType<{ className?: string }>; // FIXED ✔
  color: string;
  bgColor: string;
  gradient: string;
  lightBg: string;
  links: CategoryLink[];
}

const Dashboard = () => {
  const router = useRouter();

  /* -------------------------------------------- */
  /* Session Validation                            */
  /* -------------------------------------------- */
  useEffect(() => {
    // Support both localStorage + cookie (like your sidebar)
    const token = typeof window !== "undefined" ? localStorage.getItem("fs_admin_token") : null;
  
  }, [router]);

  const [hoveredCategory, setHoveredCategory] = useState<number | null>(null);

  /* -------------------------------------------- */
  /* Categories List                               */
  /* -------------------------------------------- */
  const categories: Category[] = [
    {
      title: "Home Page",
      icon: Home,
      color: "text-blue-600",
      bgColor: "bg-blue-600",
      gradient: "from-blue-600 to-cyan-600",
      lightBg: "bg-blue-50",
      links: [
        { name: "Hero", path: "/dashboard/home/hero" },
        { name: "About", path: "/dashboard/home/about" },
        { name: "Products", path: "/dashboard/home/products" },
        { name: "CTA", path: "/dashboard/home/cta" },
        { name: "Leadership", path: "/dashboard/home/leadership" },
        { name: "Suppliers", path: "/dashboard/home/suppliers" },
      ],
    },
    {
      title: "Content Management",
      icon: FileText,
      color: "text-purple-600",
      bgColor: "bg-purple-600",
      gradient: "from-purple-600 to-pink-600",
      lightBg: "bg-purple-50",
      links: [
        { name: "Company", path: "/dashboard/company" },
        { name: "Leadership", path: "/dashboard/leadership" },
        { name: "History", path: "/dashboard/history" },
        { name: "Privacy Policy", path: "/dashboard/privacy-policy" },
        { name: "Terms and Conditions", path: "/dashboard/terms-and-conditions" },
      ],
    },
    {
      title: "People & Access",
      icon: Users,
      color: "text-green-600",
      bgColor: "bg-green-600",
      gradient: "from-green-600 to-emerald-600",
      lightBg: "bg-green-50",
      links: [
        { name: "Sub Admins", path: "/dashboard/sub-admins" },
        { name: "Suppliers", path: "/dashboard/suppliers" },
        { name: "Supplier Forms", path: "/dashboard/supplier-forms" },
      ],
    },
    {
      title: "Products",
      icon: Package,
      color: "text-orange-600",
      bgColor: "bg-orange-600",
      gradient: "from-orange-600 to-red-600",
      lightBg: "bg-orange-50",
      links: [{ name: "Export", path: "/dashboard/products/export" }],
    },
    {
      title: "Website",
      icon: Settings,
      color: "text-indigo-600",
      bgColor: "bg-indigo-600",
      gradient: "from-indigo-600 to-blue-600",
      lightBg: "bg-indigo-50",
      links: [{ name: "Footer", path: "/dashboard/footer" }],
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100">
      {/* Header */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-blue-600/5 to-purple-600/5"></div>
        <div className="relative max-w-7xl mx-auto px-4 md:px-6 py-12">
          <div className="flex items-center gap-2 mb-3">
            <div className="inline-flex items-center justify-center w-12 h-12 bg-gradient-to-br from-blue-600 to-purple-600 rounded-xl shadow-lg">
              <Sparkles className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-4xl font-bold text-gray-900">Dashboard</h1>
          </div>
          <p className="text-gray-600 text-base max-w-xl">
            Manage your entire website
          </p>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 md:px-6 py-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 auto-rows-max">
          {categories.map((category, idx) => {
            const Icon = category.icon;
            const isHovered = hoveredCategory === idx;

            return (
              <div
                key={category.title}
                onMouseEnter={() => setHoveredCategory(idx)}
                onMouseLeave={() => setHoveredCategory(null)}
                className={`relative group bg-white border border-gray-200 rounded-xl overflow-hidden transition-all duration-300 ${
                  isHovered ? "shadow-xl scale-105 z-10" : "shadow-sm hover:shadow-md"
                }`}
              >
                {/* Top Gradient Line */}
                <div
                  className={`absolute top-0 left-0 w-full h-1 bg-gradient-to-r ${category.gradient}`}
                ></div>

                {/* Header */}
                <div className={`${category.lightBg} p-4 border-b border-gray-100`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 ${category.bgColor} rounded-xl text-white`}>
                        <Icon className="w-5 h-5" />
                      </div>
                      <h2 className="text-lg font-semibold text-gray-900">
                        {category.title}
                      </h2>
                    </div>

                    <span className="text-xs font-medium text-gray-400 bg-gray-100 px-2 py-1 rounded-full">
                      {category.links.length}
                    </span>
                  </div>
                </div>

                {/* Links */}
                <div className="p-4 space-y-1">
                  {category.links.map((link) => (
                    <Link
                      key={link.path}
                      href={link.path}
                      className={`flex items-center justify-between p-2 rounded-lg transition-all duration-200 group/link ${
                        isHovered
                          ? `${category.lightBg} border ${category.color} border-opacity-20`
                          : "hover:bg-gray-50 border border-transparent"
                      }`}
                    >
                      <span
                        className={`text-sm font-medium transition-colors ${
                          isHovered ? category.color : "text-gray-700"
                        }`}
                      >
                        {link.name}
                      </span>
                      <ArrowRight
                        className={`w-3.5 h-3.5 transition-all duration-200 ${
                          isHovered
                            ? `${category.color} translate-x-1`
                            : "text-gray-300 group-hover/link:text-gray-400"
                        }`}
                      />
                    </Link>
                  ))}
                </div>

                {/* Hover Glow */}
                {isHovered && (
                  <div
                    className={`absolute top-0 right-0 w-24 h-24 bg-gradient-to-br ${category.gradient} opacity-10 rounded-full -mr-12 -mt-12 blur-xl`}
                  ></div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
