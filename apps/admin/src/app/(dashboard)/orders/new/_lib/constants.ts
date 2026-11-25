export const PREDEFINED_TAGS = [
  { id: "paid_100",   label: "Оплачено 100%", color: "#16a34a", bg: "#dcfce7" },
  { id: "paid_50",    label: "Оплачено 50%",  color: "#d97706", bg: "#fef3c7" },
  { id: "urgent",     label: "Терміново",     color: "#dc2626", bg: "#fee2e2" },
  { id: "vip",        label: "VIP",           color: "#7c3aed", bg: "#ede9fe" },
  { id: "new_client", label: "Новий клієнт",  color: "#0284c7", bg: "#e0f2fe" },
] as const;

export const DELIVERY_OPTIONS = [
  { id: "nova_poshta", label: "Нова Пошта",  desc: "2–3 робочих дні" },
  { id: "pickup",      label: "Самовивіз",   desc: "Львів, Джерельна, 69, офіс 10" },
];
