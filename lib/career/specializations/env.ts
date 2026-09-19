import type { Specialization } from "../types";

/**
 * §3.9 — ENV. Local axes: V1 ОБЪЕКТ, V2 ПОЛЕ, V3 ПРОИЗВОДСТВО, V4 ГОРИЗОНТ.
 */
export const ENV_SPECIALIZATIONS: readonly Specialization[] = [
  {
    id: "ENV_ECO",
    field: "ENV",
    label: "Экология и охрана природы",
    localAxes: { V1: "экосистема", V2: "↑", V3: "охрана ↑↑", V4: "десятилетия" },
    differentiator: "Цель — сохранить, а не произвести",
  },
  {
    id: "ENV_AGRO",
    field: "ENV",
    label: "Агрономия",
    localAxes: { V1: "растение", V2: "↑↑", V3: "производство ↑↑", V4: "сезон" },
    differentiator: "Годовой цикл, погода как неустранимый риск",
  },
  {
    id: "ENV_FOREST",
    field: "ENV",
    label: "Лесное хозяйство",
    localAxes: { V1: "растение", V2: "↑↑", V3: "~", V4: "десятилетия" },
    differentiator: "Самый длинный горизонт среди прикладных профессий",
  },
  {
    id: "ENV_GEO",
    field: "ENV",
    label: "Геология и разведка недр",
    localAxes: { V1: "порода", V2: "↑↑", V3: "производство", V4: "~" },
    differentiator: "Экспедиции; прямой мост в ENG_PETRO и ENG_MINE",
  },
  {
    id: "ENV_HYDRO",
    field: "ENV",
    label: "Гидрология и водные ресурсы",
    localAxes: { V1: "вода", V2: "↑", V3: "~", V4: "~" },
    differentiator: "Критическая тема для Центральной Азии",
  },
  {
    id: "ENV_CLIM",
    field: "ENV",
    label: "Климатология и метеорология",
    localAxes: { V1: "воздух", V2: "↓", V3: "охрана", V4: "десятилетия" },
    differentiator: "Почти полностью данные и модели; мост в SCI_PHYS",
  },
  {
    id: "ENV_SUST",
    field: "ENV",
    label: "Устойчивое развитие и ESG",
    localAxes: { V1: "система", V2: "↓", V3: "~", V4: "~" },
    differentiator: "Работает в компании, а не в поле; мост в BIZ",
  },
  {
    id: "ENV_FOOD",
    field: "ENV",
    label: "Пищевые технологии",
    localAxes: { V1: "вещество", V2: "↓", V3: "производство ↑↑", V4: "сезон" },
    differentiator: "Мост между SCI_CHEM и производством",
  },
  {
    id: "ENV_LAND",
    field: "ENV",
    label: "Ландшафтная архитектура",
    localAxes: { V1: "растение", V2: "~", V3: "~", V4: "~" },
    differentiator: "Единственная в поле с эстетической осью; мост в ART_ARCH",
  },
  {
    id: "ENV_ANIM",
    field: "ENV",
    label: "Зоотехния и животноводство",
    localAxes: { V1: "животное", V2: "↑↑", V3: "производство ↑↑", V4: "сезон" },
    differentiator: "Живой объект в промышленном масштабе",
  },
  {
    id: "ENV_SOIL",
    field: "ENV",
    label: "Почвоведение",
    localAxes: { V1: "порода", V2: "↑", V3: "~", V4: "десятилетия" },
    differentiator: "Между геологией и агрономией",
  },
];
