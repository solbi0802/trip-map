import { geoCentroid, geoMercator, geoPath } from "d3-geo";
import type { Feature, FeatureCollection, Geometry } from "geojson";
import { useEffect, useMemo, useState } from "react";

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

type RegionRecord = {
  regionId: string;
  title: string;
  startedAt: string;
  endedAt: string;
  memo: string;
  updatedAt: string;
};

const STORAGE_KEY = "trip-map.visited-region-groups.v1";
const RECORD_STORAGE_KEY = "trip-map.region-records.v1";
const MAP_VIEW_BOX = "45 115 720 760";

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
    .replace(/시$/u, "")
    .replace(/군$/u, "")
    .replace(/구$/u, "");
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

  return {
    regionId,
    title,
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
  const [visitedRegionIds, setVisitedRegionIds] = useState<string[]>(() =>
    loadVisitedRegions(),
  );
  const [regionRecords, setRegionRecords] = useState<
    Record<string, RegionRecord>
  >(() => loadRegionRecords());
  const [selectedRegionId, setSelectedRegionId] = useState<string | null>(null);

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
  const coloredRegions = useMemo(
    () => REGION_GROUPS.filter((region) => coloredRegionSet.has(region.id)),
    [coloredRegionSet],
  );
  const recordedRegions = useMemo(
    () =>
      REGION_GROUPS.filter((region) => regionRecords[region.id]).sort(
        (firstRegion, secondRegion) =>
          regionRecords[secondRegion.id].updatedAt.localeCompare(
            regionRecords[firstRegion.id].updatedAt,
          ),
      ),
    [regionRecords],
  );

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

  return (
    <main className="app-shell">
      <section className="map-pane">
        <div className="map-header">
          <div>
            <p className="eyebrow">Trip Map MVP</p>
            <h1>국내여행 지도</h1>
          </div>
          <span className="marker-count">{coloredRegionSet.size}곳 색칠</span>
        </div>

        <div className="map-canvas region-map-canvas">
          <svg
            className="korea-map-svg"
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
                    } ${EMPHASIZED_GROUP_IDS.has(region.groupId) ? "region-emphasized" : ""}`}
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
          </svg>
        </div>

        <div className="map-hint">
          실제 시군구 경계 기반 지도입니다. 지역 이름이나 구역을 클릭하면
          파란색으로 칠해집니다.
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

        {selectedRegion ? (
          <div className="record-editor">
            <div>
              <p className="selected-label">선택한 지역</p>
              <strong>{selectedRegion.name}</strong>
              <span>{selectedRegion.englishName}</span>
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

        <div className="marker-list">
          {coloredRegions.length === 0 ? (
            <div className="empty-state">
              <strong>아직 색칠한 지역이 없어요.</strong>
              <p>
                지도에서 여행한 지역이나 기록하고 싶은 지역명을 클릭해보세요.
              </p>
            </div>
          ) : (
            coloredRegions.map((region) => {
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
                  <code>{record?.title || record?.memo || "색칠됨"}</code>
                </button>
              );
            })
          )}
        </div>

        {recordedRegions.length > 0 && (
          <div className="record-summary">
            <p className="selected-label">
              기록된 지역 {recordedRegions.length}곳
            </p>
            <div className="record-chip-list">
              {recordedRegions.map((region) => (
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
