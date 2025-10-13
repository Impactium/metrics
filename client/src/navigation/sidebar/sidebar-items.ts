import { Icon } from '@impactium/icons';

export interface NavSubItem {
  title: string;
  url: string;
  icon?: Icon.Name;
  comingSoon?: boolean;
  newTab?: boolean;
  isNew?: boolean;
}

export interface NavMainItem {
  title: string;
  url: string;
  icon?: Icon.Name;
  subItems?: NavSubItem[];
  comingSoon?: boolean;
  newTab?: boolean;
  isNew?: boolean;
}

export interface NavGroup {
  id: number;
  label?: string;
  items: NavMainItem[];
}

export const sidebarItems: NavGroup[] = [
  {
    id: 1,
    label: "Dashboards",
    items: [
      {
        title: "Speedtest",
        url: "/dashboard/speedtest",
        icon: 'Gauge',
      },
      {
        title: "Logs",
        url: "/dashboard/logs",
        icon: 'FunctionSquare',
      }
    ],
  },
  {
    id: 2,
    label: "Pages",
    items: [
      // {
      //   title: "Email",
      //   url: "/dashboard/coming-soon",
      //   icon: 'Mail',
      //   comingSoon: true,
      // },
      {
        title: "Authentication",
        url: "/auth",
        icon: 'Fingerprint',
        subItems: [
          { title: "Login", url: "/auth/login", newTab: true },
          { title: "Register", url: "/auth/register", newTab: true },
        ],
      },
    ],
  }, 
];
