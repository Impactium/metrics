import packageJson from "../../package.json";

const currentYear = new Date().getFullYear();

export const APP_CONFIG = {
  name: "Impactium Metrics",
  version: packageJson.version,
  host: 'metrics.impactium.dev',
  copyright: `© ${currentYear}, Impactium Metrics.`,
  meta: {
    title: "Impactium Metrics - метрики скорости и производительности инфраструктуры Impactium",
    description: "Метрики скорости и производительности инфраструктуры Impactium"
  },
};
