import { LayoutDashboard, Users, Settings, BarChart3, FileText } from "lucide-react"
import { NavItem } from "@/components/common/NavItem"

const sidebarItems = [
  { href: "/dashboard", icon: LayoutDashboard, label: "개요" },
  { href: "/dashboard/analytics", icon: BarChart3, label: "분석" },
  { href: "/dashboard/users", icon: Users, label: "사용자" },
  { href: "/dashboard/posts", icon: FileText, label: "게시물" },
  { href: "/dashboard/settings", icon: Settings, label: "설정" },
]

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="flex min-h-[calc(100vh-8rem)]">
      {/* 사이드바 */}
      <aside className="w-56 border-r bg-muted/30 shrink-0">
        <nav className="flex flex-col gap-1 p-4">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-3 mb-2">
            메뉴
          </p>
          {sidebarItems.map((item) => (
            <NavItem key={item.href} href={item.href} icon={item.icon} label={item.label} />
          ))}
        </nav>
      </aside>

      {/* 콘텐츠 영역 */}
      <div className="flex-1 overflow-auto">
        {children}
      </div>
    </div>
  )
}
