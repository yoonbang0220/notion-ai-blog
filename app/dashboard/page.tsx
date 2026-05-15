import type { Metadata } from "next"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Users, BarChart3, TrendingUp, ShoppingCart } from "lucide-react"

export const metadata: Metadata = {
  title: "대시보드",
}

// Next.js 16 "use cache" 지시자 활용 예제
// 이 함수의 결과는 자동으로 캐시됩니다
async function getDashboardStats() {
  "use cache"

  // 실제 구현에서는 DB 조회 또는 API 호출
  return {
    totalUsers: 1248,
    monthlyRevenue: 3842000,
    activeSessions: 72,
    totalOrders: 384,
    userGrowth: 12.5,
    revenueGrowth: 8.3,
  }
}

const recentActivities = [
  { id: "act-1", user: "김민준", action: "새 계정 생성", time: "2분 전" },
  { id: "act-2", user: "이서연", action: "주문 완료 #1024", time: "15분 전" },
  { id: "act-3", user: "박지훈", action: "비밀번호 변경", time: "1시간 전" },
  { id: "act-4", user: "최수아", action: "프로필 수정", time: "2시간 전" },
  { id: "act-5", user: "정도윤", action: "로그인", time: "3시간 전" },
]

export default async function DashboardPage() {
  const stats = await getDashboardStats()

  const statCards = [
    {
      title: "전체 사용자",
      value: stats.totalUsers.toLocaleString(),
      description: `전월 대비 +${stats.userGrowth}%`,
      icon: Users,
    },
    {
      title: "월 매출",
      value: `₩${stats.monthlyRevenue.toLocaleString()}`,
      description: `전월 대비 +${stats.revenueGrowth}%`,
      icon: BarChart3,
    },
    {
      title: "활성 세션",
      value: stats.activeSessions.toString(),
      description: "현재 접속 중인 사용자",
      icon: TrendingUp,
    },
    {
      title: "전체 주문",
      value: stats.totalOrders.toString(),
      description: "이번 달 처리된 주문",
      icon: ShoppingCart,
    },
  ]

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">대시보드</h1>
        <p className="text-muted-foreground">서비스 현황을 한눈에 확인하세요</p>
      </div>

      {/* 통계 카드 */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {statCards.map((card) => (
          <Card key={card.title}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {card.title}
              </CardTitle>
              <card.icon className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{card.value}</p>
              <CardDescription className="text-xs mt-1">
                {card.description}
              </CardDescription>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* 최근 활동 */}
      <Card>
        <CardHeader>
          <CardTitle>최근 활동</CardTitle>
          <CardDescription>최근 사용자 활동 내역입니다</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {recentActivities.map((activity) => (
              <div
                key={activity.id}
                className="flex items-center justify-between text-sm"
              >
                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center text-xs font-medium">
                    {activity.user[0]}
                  </div>
                  <div>
                    <p className="font-medium">{activity.user}</p>
                    <p className="text-muted-foreground text-xs">{activity.action}</p>
                  </div>
                </div>
                <span className="text-muted-foreground text-xs">{activity.time}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
