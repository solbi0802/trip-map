import { geoCentroid, geoMercator, geoPath } from "d3-geo";
import type { Feature, FeatureCollection, Geometry } from "geojson";
import { useEffect, useMemo, useRef, useState } from "react";

import koreaMunicipalities from "./data/skorea_municipalities_geo_simple.json";

type RegionProperties = {
  code: string;
  name: string;
  name_eng: string;
  base_year: string;
};

type RegionFeature = Feature<Geometry, RegionProperties>;

type RegionShape = {
  id: string;
  groupId: string;
  name: string;
  fullName: string;
  englishName: string;
  path: string;
  label: [x: number, y: number];
};

type RegionGroup = {
  id: string;
  name: string;
  englishName: string;
  label: [x: number, y: number];
  centroid: [x: number, y: number];
  regionIds: string[];
};

type VisitStatus = "want" | "visited" | "revisit";
type RegionFilter = "all" | "colored" | "recorded" | VisitStatus;
type RegionSort = "updated" | "period" | "name";

type RegionRecord = {
  regionId: string;
  title: string;
  status: VisitStatus;
  startedAt: string;
  endedAt: string;
  memo: string;
  updatedAt: string;
};

const STORAGE_KEY = "trip-map.visited-region-groups.v1";
const RECORD_STORAGE_KEY = "trip-map.region-records.v1";
const MAP_VIEW_BOX = "45 115 720 760";
const MIN_MAP_ZOOM = 0.75;
const MAX_MAP_ZOOM = 2;
const MAP_ZOOM_STEP = 0.25;

const VISIT_STATUS_OPTIONS: Array<{
  value: VisitStatus;
  label: string;
  description: string;
}> = [
  { value: "want", label: "가고 싶음", description: "아직 여행 전" },
  { value: "visited", label: "방문 완료", description: "다녀온 곳" },
  { value: "revisit", label: "또 가고 싶음", description: "재방문 후보" },
];

const FILTER_OPTIONS: Array<{ value: RegionFilter; label: string }> = [
  { value: "all", label: "전체" },
  { value: "colored", label: "색칠됨" },
  { value: "recorded", label: "기록 있음" },
  { value: "want", label: "가고 싶음" },
  { value: "visited", label: "방문 완료" },
  { value: "revisit", label: "또 가고 싶음" },
];

const SORT_OPTIONS: Array<{ value: RegionSort; label: string }> = [
  { value: "updated", label: "최근 수정순" },
  { value: "period", label: "여행일순" },
  { value: "name", label: "지역명순" },
];

const geoJson = koreaMunicipalities as FeatureCollection<
  Geometry,
  RegionProperties
>;

const METROPOLITAN_PREFIX_NAMES: Record<string, string> = {
  "11": "서울",
  "21": "부산",
  "22": "대구",
  "23": "인천",
  "24": "광주",
  "25": "대전",
  "26": "울산",
  "29": "세종",
};

const LABEL_POSITION_OVERRIDES: Record<string, [x: number, y: number]> = {
  "metro-11": [319, 295],
  "metro-23": [267, 301],
  "region-31030": [337, 274],
  "region-31200": [292, 257],
  "region-31260": [316, 264],
  "region-31080": [331, 249],
  "city-고양": [298, 283],
  "region-31230": [280, 277],
  "city-부천": [286, 303],
  "region-31060": [303, 310],
  "city-안양": [301, 331],
  "city-성남": [351, 311],
  "region-31120": [346, 289],
  "region-31110": [333, 304],
  "region-31180": [346, 300],
  "region-31150": [296, 319],
  "city-안산": [297, 329],
  "city-수원": [323, 337],
  "city-용인": [343, 333],
  "city-청주": [366, 407],
};

const EMPHASIZED_GROUP_IDS = new Set([
  "city-부천",
  "city-안양",
  "region-31110",
]);

function getShortName(name: string) {
  return name
    .replace(/특별자치도$/u, "")
    .replace(/특별자치시$/u, "")
    .replace(/광역시$/u, "")
    .replace(/특별시$/u, "")
    .replace(/[시군구]$/u, "");
}

function getDisplayName(feature: RegionFeature) {
  const metroName =
    METROPOLITAN_PREFIX_NAMES[feature.properties.code.slice(0, 2)];
  if (metroName) {
    return metroName;
  }

  if (feature.properties.name === "울릉군") {
    return "울릉도";
  }

  if (feature.properties.name === "청원군") {
    return "청주";
  }

  const cityWithDistrict = feature.properties.name.match(/^(.+?)시.+구$/u);
  if (cityWithDistrict) {
    return getShortName(`${cityWithDistrict[1]}시`);
  }

  return getShortName(feature.properties.name);
}

function getGroupId(feature: RegionFeature) {
  const metroName =
    METROPOLITAN_PREFIX_NAMES[feature.properties.code.slice(0, 2)];
  if (metroName) {
    return `metro-${feature.properties.code.slice(0, 2)}`;
  }

  if (feature.properties.name === "청원군") {
    return "city-청주";
  }

  const cityWithDistrict = feature.properties.name.match(/^(.+?)시.+구$/u);
  if (cityWithDistrict) {
    return `city-${cityWithDistrict[1]}`;
  }

  return `region-${feature.properties.code}`;
}

function createRegionShapes(): RegionShape[] {
  const projection = geoMercator()
    .center([127.72, 36.12])
    .scale(5550)
    .translate([390, 468]);
  const pathGenerator = geoPath(projection);

  return geoJson.features
    .map((feature: RegionFeature): RegionShape | null => {
      const path = pathGenerator(feature);
      const centroid = projection(geoCentroid(feature));

      if (!path || !centroid) {
        return null;
      }

      return {
        id: feature.properties.code,
        groupId: getGroupId(feature),
        name: getDisplayName(feature),
        fullName: feature.properties.name,
        englishName: feature.properties.name_eng,
        path,
        label: centroid as [number, number],
      };
    })
    .filter((region): region is RegionShape => region !== null);
}

const REGION_SHAPES = createRegionShapes();

function createRegionGroups() {
  const groups = new Map<
    string,
    RegionGroup & { totalX: number; totalY: number; count: number }
  >();

  REGION_SHAPES.forEach((region) => {
    const group = groups.get(region.groupId);

    if (!group) {
      groups.set(region.groupId, {
        id: region.groupId,
        name: region.name,
        englishName: region.englishName,
        label: region.label,
        centroid: region.label,
        regionIds: [region.id],
        totalX: region.label[0],
        totalY: region.label[1],
        count: 1,
      });
      return;
    }

    group.regionIds.push(region.id);
    group.totalX += region.label[0];
    group.totalY += region.label[1];
    group.count += 1;
    group.centroid = [group.totalX / group.count, group.totalY / group.count];
    group.label = group.centroid;
  });

  return Array.from(groups.values()).map(
    ({ totalX, totalY, count, ...group }) => ({
      ...group,
      label: LABEL_POSITION_OVERRIDES[group.id] ?? group.label,
    }),
  );
}

const REGION_GROUPS = createRegionGroups();

function isVisitStatus(value: unknown): value is VisitStatus {
  return value === "want" || value === "visited" || value === "revisit";
}

function loadVisitedRegions() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return [];
    const parsed: unknown = JSON.parse(stored);
    if (!Array.isArray(parsed)) return [];

    const validIds = new Set(REGION_GROUPS.map((region) => region.id));
    return parsed.filter(
      (id): id is string => typeof id === "string" && validIds.has(id),
    );
  } catch {
    return [];
  }
}

function saveVisitedRegions(regionIds: string[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(regionIds));
}

function normalizeRegionRecord(
  regionId: string,
  value: unknown,
): RegionRecord | null {
  if (!value || typeof value !== "object") return null;

  const record = value as Record<string, unknown>;
  const { memo, regionId: storedRegionId, title, updatedAt } = record;
  const hasRequiredFields =
    typeof storedRegionId === "string" &&
    typeof title === "string" &&
    typeof memo === "string" &&
    typeof updatedAt === "string";

  if (!hasRequiredFields || storedRegionId !== regionId) {
    return null;
  }

  const startedAt =
    typeof record.startedAt === "string"
      ? record.startedAt
      : typeof record.visitedAt === "string"
        ? record.visitedAt
        : "";
  const endedAt = typeof record.endedAt === "string" ? record.endedAt : "";
  const status = isVisitStatus(record.status) ? record.status : "visited";

  return {
    regionId,
    title,
    status,
    startedAt,
    endedAt,
    memo,
    updatedAt,
  };
}

function loadRegionRecords() {
  try {
    const stored = localStorage.getItem(RECORD_STORAGE_KEY);
    if (!stored) return {};

    const parsed: unknown = JSON.parse(stored);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed))
      return {};

    const validIds = new Set(REGION_GROUPS.map((region) => region.id));
    const records = Object.entries(parsed)
      .filter(([regionId]) => validIds.has(regionId))
      .map(
        ([regionId, record]) =>
          [regionId, normalizeRegionRecord(regionId, record)] as const,
      )
      .filter(
        (entry): entry is readonly [string, RegionRecord] => entry[1] !== null,
      );

    return Object.fromEntries(records);
  } catch {
    return {};
  }
}

function saveRegionRecords(records: Record<string, RegionRecord>) {
  localStorage.setItem(RECORD_STORAGE_KEY, JSON.stringify(records));
}

export default function App() {
  const mapSvgRef = useRef<SVGSVGElement | null>(null);
  const [visitedRegionIds, setVisitedRegionIds] = useState<string[]>(() =>
    loadVisitedRegions(),
  );
  const [regionRecords, setRegionRecords] = useState<
    Record<string, RegionRecord>
  >(() => loadRegionRecords());
  const [selectedRegionId, setSelectedRegionId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [regionFilter, setRegionFilter] = useState<RegionFilter>("all");
  const [regionSort, setRegionSort] = useState<RegionSort>("updated");
  const [isExportingMap, setIsExportingMap] = useState(false);
  const [mapZoom, setMapZoom] = useState(1);

  const visitedRegionSet = useMemo(
    () => new Set(visitedRegionIds),
    [visitedRegionIds],
  );
  const coloredRegionSet = useMemo(
    () => new Set([...visitedRegionIds, ...Object.keys(regionRecords)]),
    [regionRecords, visitedRegionIds],
  );
  const selectedRegion = useMemo(
    () =>
      REGION_GROUPS.find((region) => region.id === selectedRegionId) ?? null,
    [selectedRegionId],
  );
  const selectedRecord = selectedRegion
    ? (regionRecords[selectedRegion.id] ?? null)
    : null;
  const trackedRegions = useMemo(
    () =>
      REGION_GROUPS.filter((region) => coloredRegionSet.has(region.id)).sort(
        (firstRegion, secondRegion) => {
          const firstUpdatedAt = regionRecords[firstRegion.id]?.updatedAt ?? "";
          const secondUpdatedAt =
            regionRecords[secondRegion.id]?.updatedAt ?? "";

          if (firstUpdatedAt || secondUpdatedAt) {
            return secondUpdatedAt.localeCompare(firstUpdatedAt);
          }

          return firstRegion.name.localeCompare(secondRegion.name, "ko");
        },
      ),
    [coloredRegionSet, regionRecords],
  );
  const regionStats = useMemo(() => {
    const stats = {
      colored: coloredRegionSet.size,
      recorded: coloredRegionSet.size,
      want: 0,
      visited: 0,
      revisit: 0,
    };

    coloredRegionSet.forEach((regionId) => {
      const status = regionRecords[regionId]?.status ?? "visited";
      stats[status] += 1;
    });

    return stats;
  }, [coloredRegionSet, regionRecords]);
  const visibleRegions = useMemo(() => {
    const normalizedSearchQuery = searchQuery.trim().toLocaleLowerCase();

    return REGION_GROUPS.filter((region) => {
      const record = regionRecords[region.id];
      const isColored = coloredRegionSet.has(region.id);
      const effectiveStatus = record?.status ?? (isColored ? "visited" : null);

      if (regionFilter === "colored" && !isColored) return false;
      if (regionFilter === "recorded" && !record) return false;
      if (isVisitStatus(regionFilter) && effectiveStatus !== regionFilter)
        return false;
      if (!isColored && regionFilter !== "all") return false;

      if (!normalizedSearchQuery) {
        return regionFilter === "all" ? isColored || Boolean(record) : true;
      }

      const searchableText = [
        region.name,
        region.englishName,
        record?.title,
        record?.memo,
        getTravelPeriodText(record, ""),
      ]
        .filter(Boolean)
        .join(" ")
        .toLocaleLowerCase();

      return searchableText.includes(normalizedSearchQuery);
    }).sort((firstRegion, secondRegion) => {
      const firstRecord = regionRecords[firstRegion.id];
      const secondRecord = regionRecords[secondRegion.id];

      if (regionSort === "name") {
        return firstRegion.name.localeCompare(secondRegion.name, "ko");
      }

      if (regionSort === "period") {
        const firstPeriod =
          firstRecord?.startedAt || firstRecord?.endedAt || "";
        const secondPeriod =
          secondRecord?.startedAt || secondRecord?.endedAt || "";

        if (firstPeriod || secondPeriod) {
          return secondPeriod.localeCompare(firstPeriod);
        }
      }

      return (secondRecord?.updatedAt ?? "").localeCompare(
        firstRecord?.updatedAt ?? "",
      );
    });
  }, [coloredRegionSet, regionFilter, regionRecords, regionSort, searchQuery]);

  useEffect(() => {
    saveVisitedRegions(visitedRegionIds);
  }, [visitedRegionIds]);

  useEffect(() => {
    saveRegionRecords(regionRecords);
  }, [regionRecords]);

  function markRegionVisited(regionId: string) {
    setVisitedRegionIds((currentRegionIds) =>
      currentRegionIds.includes(regionId)
        ? currentRegionIds
        : [...currentRegionIds, regionId],
    );
  }

  function toggleRegion(region: RegionGroup) {
    setSelectedRegionId(region.id);
    setVisitedRegionIds((currentRegionIds) =>
      currentRegionIds.includes(region.id)
        ? currentRegionIds.filter((regionId) => regionId !== region.id)
        : [...currentRegionIds, region.id],
    );
  }

  function toggleShape(region: RegionShape) {
    const group = REGION_GROUPS.find((item) => item.id === region.groupId);
    if (group) {
      toggleRegion(group);
    }
  }

  function clearVisitedRegions() {
    setVisitedRegionIds([]);
    setSelectedRegionId(null);
  }

  function updateRegionRecord(
    region: RegionGroup,
    patch: Partial<Omit<RegionRecord, "regionId" | "updatedAt">>,
  ) {
    markRegionVisited(region.id);

    setRegionRecords((currentRecords) => {
      const currentRecord = currentRecords[region.id] ?? {
        regionId: region.id,
        title: "",
        status: "visited",
        startedAt: "",
        endedAt: "",
        memo: "",
        updatedAt: "",
      };

      return {
        ...currentRecords,
        [region.id]: {
          ...currentRecord,
          ...patch,
          updatedAt: new Date().toISOString(),
        },
      };
    });
  }

  function deleteRegionRecord(regionId: string) {
    setRegionRecords((currentRecords) => {
      const { [regionId]: _deletedRecord, ...nextRecords } = currentRecords;
      return nextRecords;
    });
  }

  function getTravelPeriodText(
    record: RegionRecord | undefined,
    fallbackText: string,
  ) {
    if (!record) return fallbackText;
    if (record.startedAt && record.endedAt)
      return `${record.startedAt} ~ ${record.endedAt}`;
    if (record.startedAt) return `${record.startedAt} ~`;
    if (record.endedAt) return `~ ${record.endedAt}`;
    return fallbackText;
  }

  function getStatusLabel(status: VisitStatus | undefined) {
    return (
      VISIT_STATUS_OPTIONS.find((option) => option.value === status)?.label ??
      "방문 완료"
    );
  }

  function getRegionStatusClass(regionId: string) {
    const status =
      regionRecords[regionId]?.status ??
      (coloredRegionSet.has(regionId) ? "visited" : undefined);
    return status ? `region-status-${status}` : "";
  }

  function changeMapZoom(direction: -1 | 1) {
    setMapZoom((currentZoom) => {
      const nextZoom = currentZoom + direction * MAP_ZOOM_STEP;
      return Math.min(MAX_MAP_ZOOM, Math.max(MIN_MAP_ZOOM, nextZoom));
    });
  }

  async function downloadMapImage() {
    const svg = mapSvgRef.current;
    if (!svg || isExportingMap) return;

    setIsExportingMap(true);

    try {
      const clonedSvg = svg.cloneNode(true) as SVGSVGElement;
      const sourceElements = [svg, ...svg.querySelectorAll<SVGElement>("*")];
      const clonedElements = [
        clonedSvg,
        ...clonedSvg.querySelectorAll<SVGElement>("*"),
      ];
      const styleProperties = [
        "fill",
        "stroke",
        "stroke-width",
        "stroke-linejoin",
        "stroke-linecap",
        "stroke-dasharray",
        "font-family",
        "font-size",
        "font-weight",
        "paint-order",
        "text-anchor",
      ];

      sourceElements.forEach((element, index) => {
        const clonedElement = clonedElements[index];
        if (!clonedElement) return;

        const computedStyle = window.getComputedStyle(element);
        const inlineStyle = styleProperties
          .map(
            (property) =>
              `${property}:${computedStyle.getPropertyValue(property)}`,
          )
          .join(";");

        clonedElement.setAttribute("style", inlineStyle);
      });

      clonedSvg.setAttribute("xmlns", "http://www.w3.org/2000/svg");
      clonedSvg.setAttribute("width", "1440");
      clonedSvg.setAttribute("height", "1520");

      const svgMarkup = new XMLSerializer().serializeToString(clonedSvg);
      const svgBlob = new Blob([svgMarkup], {
        type: "image/svg+xml;charset=utf-8",
      });
      const imageUrl = URL.createObjectURL(svgBlob);
      const image = new Image();

      await new Promise<void>((resolve, reject) => {
        image.onload = () => resolve();
        image.onerror = () =>
          reject(new Error("지도 이미지를 불러오지 못했습니다."));
        image.src = imageUrl;
      });

      const canvas = document.createElement("canvas");
      canvas.width = 1440;
      canvas.height = 1520;
      const context = canvas.getContext("2d");

      if (!context) {
        throw new Error("이미지 저장을 지원하지 않는 브라우저입니다.");
      }

      context.fillStyle = "#ffffff";
      context.fillRect(0, 0, canvas.width, canvas.height);
      context.drawImage(image, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(imageUrl);

      const pngBlob = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob((blob) => {
          if (blob) resolve(blob);
          else reject(new Error("PNG 파일을 생성하지 못했습니다."));
        }, "image/png");
      });
      const downloadUrl = URL.createObjectURL(pngBlob);
      const link = document.createElement("a");
      const today = new Date().toISOString().slice(0, 10);

      link.href = downloadUrl;
      link.download = `trip-map-${today}.png`;
      link.click();
      URL.revokeObjectURL(downloadUrl);
    } catch (error) {
      console.warn("Failed to export map image", error);
      window.alert(
        "지도 이미지 저장에 실패했습니다. 잠시 후 다시 시도해주세요.",
      );
    } finally {
      setIsExportingMap(false);
    }
  }

  return (
    <main className="app-shell">
      <section className="map-pane">
        <div className="map-header">
          <div>
            <p className="eyebrow">Trip Map MVP</p>
            <h1>국내여행 지도</h1>
          </div>
          <div className="map-header-actions">
            <span className="marker-count">{regionStats.colored}곳 색칠</span>
            <button
              className="map-download-button"
              disabled={isExportingMap}
              onClick={downloadMapImage}
              type="button"
            >
              {isExportingMap ? "저장 중..." : "이미지 저장"}
            </button>
          </div>
        </div>

        <div className="map-canvas-shell">
          <div className="map-canvas region-map-canvas">
            <div
              className="map-zoom-stage"
              style={{
                height: `${mapZoom * 100}%`,
                width: `${mapZoom * 100}%`,
              }}
            >
              <svg
                className="korea-map-svg"
                ref={mapSvgRef}
                viewBox={MAP_VIEW_BOX}
                role="img"
                aria-label="대한민국 시군구 행정구역 지도"
              >
            <g className="region-layer">
              {REGION_SHAPES.map((region) => {
                const isVisitedGroup = coloredRegionSet.has(region.groupId);
                const isSelected = selectedRegionId === region.groupId;

                return (
                  <path
                    aria-label={region.fullName}
                    className={`region-shape ${isVisitedGroup ? "region-visited" : ""} ${
                      isSelected ? "region-selected" : ""
                    } ${getRegionStatusClass(region.groupId)} ${
                      EMPHASIZED_GROUP_IDS.has(region.groupId)
                        ? "region-emphasized"
                        : ""
                    }`}
                    d={region.path}
                    key={region.id}
                    onClick={() => toggleShape(region)}
                  />
                );
              })}
            </g>

            <g className="connector-layer">
              {REGION_GROUPS.filter(
                (region) =>
                  EMPHASIZED_GROUP_IDS.has(region.id) &&
                  (region.centroid[0] !== region.label[0] ||
                    region.centroid[1] !== region.label[1]),
              ).map((region) => (
                <line
                  className="label-connector"
                  key={`${region.id}-connector`}
                  x1={region.centroid[0]}
                  x2={region.label[0]}
                  y1={region.centroid[1]}
                  y2={region.label[1] - 4}
                />
              ))}
            </g>

            <g className="label-layer">
              {REGION_GROUPS.map((region) => {
                const isVisited = coloredRegionSet.has(region.id);

                return (
                  <text
                    className={`region-label ${isVisited ? "region-label-visited" : ""}`}
                    key={`${region.id}-label`}
                    x={region.label[0]}
                    y={region.label[1]}
                    onClick={() => toggleRegion(region)}
                  >
                    {region.name}
                  </text>
                );
              })}
            </g>

                <g
                  className="map-legend"
                  role="group"
                  aria-label="지도 색상 안내"
                  transform="translate(620 132)"
                >
              <rect
                className="map-legend-background"
                height="88"
                rx="4"
                width="132"
              />
              <text className="map-legend-title" x="10" y="17">
                색상 안내
              </text>

              <rect
                className="map-legend-swatch map-legend-swatch-visited"
                height="9"
                rx="1"
                width="15"
                x="10"
                y="27"
              />
              <text className="map-legend-label" x="33" y="35">
                방문한 곳
              </text>

              <rect
                className="map-legend-swatch map-legend-swatch-want"
                height="9"
                rx="1"
                width="15"
                x="10"
                y="47"
              />
              <text className="map-legend-label" x="33" y="55">
                가고 싶음
              </text>

              <rect
                className="map-legend-swatch map-legend-swatch-revisit"
                height="9"
                rx="1"
                width="15"
                x="10"
                y="67"
              />
              <text className="map-legend-label" x="33" y="75">
                또 가고 싶음
              </text>
                </g>
              </svg>
            </div>
          </div>

          <div className="map-zoom-controls" aria-label="지도 확대 및 축소">
            <button
              aria-label="지도 축소"
              disabled={mapZoom <= MIN_MAP_ZOOM}
              onClick={() => changeMapZoom(-1)}
              title="지도 축소"
              type="button"
            >
              −
            </button>
            <span aria-live="polite">{Math.round(mapZoom * 100)}%</span>
            <button
              aria-label="지도 확대"
              disabled={mapZoom >= MAX_MAP_ZOOM}
              onClick={() => changeMapZoom(1)}
              title="지도 확대"
              type="button"
            >
              +
            </button>
          </div>
        </div>

        <div className="map-hint">
          실제 시군구 경계 기반 지도입니다. 지역을 선택하고 방문 상태에 따라
          색칠해보세요.
        </div>
      </section>

      <aside className="side-panel">
        <div className="panel-header">
          <div>
            <p className="eyebrow">Travel Records</p>
            <h2>지역별 여행 기록</h2>
          </div>
          <button
            className="ghost-button"
            disabled={visitedRegionIds.length === 0}
            onClick={clearVisitedRegions}
          >
            색칠 해제
          </button>
        </div>

        <div className="stats-grid" aria-label="여행 기록 요약">
          <div>
            <strong>{regionStats.recorded}</strong>
            <span>기록</span>
          </div>
          <div>
            <strong>{regionStats.visited}</strong>
            <span>방문 완료</span>
          </div>
          <div>
            <strong>{regionStats.want}</strong>
            <span>가고 싶음</span>
          </div>
          <div>
            <strong>{regionStats.revisit}</strong>
            <span>또 가고 싶음</span>
          </div>
        </div>

        {selectedRegion ? (
          <div className="record-editor">
            <div>
              <p className="selected-label">선택한 지역</p>
              <strong>{selectedRegion.name}</strong>
              <span>{selectedRegion.englishName}</span>
            </div>

            <div className="field-label">
              방문 상태
              <div className="status-segmented">
                {VISIT_STATUS_OPTIONS.map((option) => (
                  <button
                    className={`status-option status-option-${option.value} ${
                      (selectedRecord?.status ?? "visited") === option.value
                        ? "status-option-active"
                        : ""
                    }`}
                    key={option.value}
                    onClick={() =>
                      updateRegionRecord(selectedRegion, {
                        status: option.value,
                      })
                    }
                    type="button"
                  >
                    <strong>{option.label}</strong>
                    <span>{option.description}</span>
                  </button>
                ))}
              </div>
            </div>

            <label className="field-label">
              제목
              <input
                className="text-field"
                maxLength={40}
                onChange={(event) =>
                  updateRegionRecord(selectedRegion, {
                    title: event.target.value,
                  })
                }
                placeholder={`${selectedRegion.name} 여행`}
                type="text"
                value={selectedRecord?.title ?? ""}
              />
            </label>

            <div className="date-range-fields">
              <label className="field-label">
                여행 시작일
                <input
                  className="text-field"
                  max={selectedRecord?.endedAt || undefined}
                  onChange={(event) =>
                    updateRegionRecord(selectedRegion, {
                      startedAt: event.target.value,
                    })
                  }
                  type="date"
                  value={selectedRecord?.startedAt ?? ""}
                />
              </label>

              <label className="field-label">
                여행 종료일
                <input
                  className="text-field"
                  min={selectedRecord?.startedAt || undefined}
                  onChange={(event) =>
                    updateRegionRecord(selectedRegion, {
                      endedAt: event.target.value,
                    })
                  }
                  type="date"
                  value={selectedRecord?.endedAt ?? ""}
                />
              </label>
            </div>

            <label className="field-label">
              메모
              <textarea
                className="text-field memo-field"
                maxLength={500}
                onChange={(event) =>
                  updateRegionRecord(selectedRegion, {
                    memo: event.target.value,
                  })
                }
                placeholder="여행에서 기억하고 싶은 순간을 적어보세요."
                value={selectedRecord?.memo ?? ""}
              />
            </label>

            <div className="record-actions">
              <button
                className="ghost-button"
                onClick={() => toggleRegion(selectedRegion)}
              >
                색칠 전환
              </button>
              <button
                className="danger-button"
                disabled={!selectedRecord}
                onClick={() => deleteRegionRecord(selectedRegion.id)}
              >
                기록 삭제
              </button>
            </div>
          </div>
        ) : (
          <div className="empty-state">
            <strong>기록할 지역을 선택하세요.</strong>
            <p>
              지도에서 지역 이름이나 구역을 클릭하면 제목, 여행 기간, 메모를
              남길 수 있어요.
            </p>
          </div>
        )}

        <section className="record-list-section" aria-label="지역 기록 목록">
          <div className="list-toolbar">
            <label className="field-label">
              검색
              <input
                className="text-field"
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="지역명, 제목, 메모 검색"
                type="search"
                value={searchQuery}
              />
            </label>

            <div className="toolbar-grid">
              <label className="field-label">
                필터
                <select
                  className="text-field"
                  onChange={(event) =>
                    setRegionFilter(event.target.value as RegionFilter)
                  }
                  value={regionFilter}
                >
                  {FILTER_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="field-label">
                정렬
                <select
                  className="text-field"
                  onChange={(event) =>
                    setRegionSort(event.target.value as RegionSort)
                  }
                  value={regionSort}
                >
                  {SORT_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </div>

          <div className="list-title-row">
            <p className="selected-label">기록 목록</p>
            <span>{visibleRegions.length}곳</span>
          </div>

          <div className="marker-list">
            {visibleRegions.length === 0 ? (
              <div className="empty-state">
                <strong>조건에 맞는 지역이 없어요.</strong>
                <p>
                  지도에서 지역을 선택해 기록을 남기거나 검색 조건을 바꿔보세요.
                </p>
              </div>
            ) : (
              visibleRegions.map((region) => {
                const record = regionRecords[region.id];

                return (
                  <button
                    className={`marker-card ${region.id === selectedRegionId ? "marker-card-active" : ""}`}
                    key={region.id}
                    onClick={() => setSelectedRegionId(region.id)}
                  >
                    <span>
                      <strong>{region.name}</strong>
                      <small>
                        {getTravelPeriodText(record, region.englishName)}
                      </small>
                    </span>
                    <span className="record-card-meta">
                      <em
                        className={`status-badge status-badge-${record?.status ?? "plain"}`}
                      >
                        {getStatusLabel(record?.status)}
                      </em>
                      <code>{record?.title || record?.memo || "색칠됨"}</code>
                    </span>
                  </button>
                );
              })
            )}
          </div>
        </section>

        {trackedRegions.length > 0 && (
          <div className="record-summary">
            <p className="selected-label">
              기록된 지역 {trackedRegions.length}곳
            </p>
            <div className="record-chip-list">
              {trackedRegions.map((region) => (
                <button
                  className="record-chip"
                  key={`${region.id}-record-chip`}
                  onClick={() => setSelectedRegionId(region.id)}
                >
                  {region.name}
                </button>
              ))}
            </div>
          </div>
        )}
      </aside>
    </main>
  );
}
