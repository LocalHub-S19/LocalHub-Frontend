<script setup>
import {
  computed,
  nextTick,
  onBeforeUnmount,
  onMounted,
  ref,
  watch,
} from 'vue'

import { API } from '@/api.js'
import { useRoute } from 'vue-router'

/**
 * [신규 페이지] LocalHub 서울 여행 탐색
 *
 * 주요 기능
 * 1. 목록/지도 두 개 탭으로 동일한 지역정보 탐색
 * 2. 목록 카드에 이미지·주소·전화번호·카테고리 표시
 * 3. Leaflet + OpenStreetMap 기반 서울 지역정보 핀 표시
 * 4. 카테고리별 핀 색상·아이콘 및 개별 표시/숨김
 * 5. 장소명·주소 검색, 이미지 보유 장소 필터
 * 6. 핀 선택 시 상세 API로 이미지·주소·전화·분류 정보 표시
 * 7. 두 장소를 출발지/도착지로 지정하고 ODsay 대중교통 경로 표시
 * 8. 상단에 서울 현재 날씨와 여행 적합도 표시
 * 9. 기존 Home/Board 화면과 유사한 카드·색상·반응형 규칙 적용
 *
 * 충돌 방지를 위해 이 파일만 추가하며 Home/Header/Router는 수정하지 않습니다.
 */

const SEOUL_CENTER = [37.5665, 126.978]
const LEAFLET_VERSION = '1.9.4'
const LEAFLET_CSS_URL = `https://cdn.jsdelivr.net/npm/leaflet@${LEAFLET_VERSION}/dist/leaflet.css`
const LEAFLET_JS_URL = `https://cdn.jsdelivr.net/npm/leaflet@${LEAFLET_VERSION}/dist/leaflet.js`
const ODSAY_API_KEY = String(import.meta.env.VITE_ODSAY_API_KEY || '').trim()
// 목록/지도 모두 일반 지역정보 API의 페이지네이션을 사용합니다.
// /api/locations/map은 limit 상한이 있어 전체 데이터를 가져올 수 없으므로,
// 전체 조회가 필요한 경우 /api/locations를 페이지 단위로 호출합니다.
const LIST_FETCH_SIZE = 100
const MAP_FETCH_SIZE = 100
const LIST_INITIAL_LIMIT = 24
const LIST_MORE_SIZE = 24

const CATEGORY_CONFIG = [
  { id: '관광지', label: '관광지', emoji: '🗺️', color: '#2563eb' },
  { id: '문화시설', label: '문화시설', emoji: '🎨', color: '#d97706' },
  { id: '축제공연행사', label: '축제·행사', emoji: '🎉', color: '#9333ea' },
  { id: '여행코스', label: '여행코스', emoji: '🎒', color: '#059669' },
  { id: '레포츠', label: '레포츠', emoji: '🚴', color: '#0891b2' },
  { id: '숙박', label: '숙박', emoji: '🏨', color: '#4f46e5' },
  { id: '쇼핑', label: '쇼핑', emoji: '🛍️', color: '#e11d48' },
  { id: '음식점', label: '맛집', emoji: '🍽️', color: '#ea580c' },
]

const INITIAL_CATEGORIES = [
  '관광지',
  '문화시설',
  '축제공연행사',
  '음식점',
]

const route = useRoute()

const activeTab = ref(
  route.query.tab === 'map' ? 'map' : 'list',
)

const mapElement = ref(null)
const mapReady = ref(false)
const mapLoading = ref(false)
const mapError = ref('')

const selectedCategories = ref([...INITIAL_CATEGORIES])

// [수정] 지도 데이터도 페이지 단위로 저장합니다.
const categoryCache = ref({})
const categoryPagination = ref({})
const categoryLoading = ref({})

const searchResults = ref([])
const searchPagination = ref({})

const mapMoreLoading = ref(false)
const mapAllLoading = ref(false)

const searchInput = ref('')
const appliedKeyword = ref('')
const imageOnly = ref(false)
const dataError = ref('')

const listCategoryCache = ref({})
const listCategoryPagination = ref({})

const listSearchResults = ref([])
const listSearchPagination = ref({})

const listCategoryLoading = ref({})
const listLoading = ref(true)
const listMoreLoading = ref(false)
const listError = ref('')
const listDisplayLimit = ref(LIST_INITIAL_LIMIT)
const listImageFailures = ref({})

// [추가] 현재 Leaflet 화면 범위입니다.
// 카테고리를 바꿔도 지도의 중심과 줌을 유지하고, 이 범위 안의 핀만 표시합니다.
const mapViewport = ref(null)

const selectedPlace = ref(null)
const detailLoading = ref(false)
const detailError = ref('')
const selectedImageFailed = ref(false)
const detailCache = new Map()

const weather = ref(null)
const weatherLoading = ref(true)
const weatherError = ref('')

const routeStart = ref(null)
const routeEnd = ref(null)
const routeLoading = ref(false)
const routeError = ref('')
const routeInfo = ref(null)

let leafletMap = null
let markerLayer = null
let routeLayer = null
let currentLocationLayer = null
let markerById = new Map()
let renderMarkerSequence = 0

const categoryMap = Object.fromEntries(
  CATEGORY_CONFIG.map((category) => [category.id, category]),
)

const allCategoriesSelected = computed(
  () => selectedCategories.value.length === CATEGORY_CONFIG.length,
)

const mapLoadedRawLocations = computed(() => {
  const source = appliedKeyword.value
    ? searchResults.value
    : selectedCategories.value.flatMap(
        (category) => categoryCache.value[category] || [],
      )

  const unique = new Map()

  source.forEach((location) => {
    if (!selectedCategories.value.includes(location.category)) {
      return
    }

    if (imageOnly.value && !getListImage(location)) {
      return
    }

    unique.set(String(location.content_id), location)
  })

  return [...unique.values()]
})

const activeLocations = computed(() =>
  mapLoadedRawLocations.value.filter((location) =>
    hasValidCoordinates(location),
  ),
)

// [추가] 현재 지도 화면 안에 들어오는 장소만 실제 핀과 목록에 표시합니다.
const visibleLocations = computed(() =>
  activeLocations.value.filter((location) => isLocationInViewport(location)),
)

const previewLocations = computed(() => visibleLocations.value.slice(0, 12))

const activeListLocations = computed(() => {
  const source = appliedKeyword.value
    ? listSearchResults.value
    : selectedCategories.value.flatMap(
        (category) => listCategoryCache.value[category] || [],
      )

  const unique = new Map()

  source.forEach((location) => {
    if (!selectedCategories.value.includes(location.category)) {
      return
    }

    if (imageOnly.value && !getListImage(location)) {
      return
    }

    unique.set(String(location.content_id), location)
  })

  return [...unique.values()].sort((a, b) =>
    String(a.title || '').localeCompare(String(b.title || ''), 'ko'),
  )
})

const displayedListLocations = computed(() =>
  activeListLocations.value.slice(0, listDisplayLimit.value),
)

const currentListPagination = computed(() =>
  appliedKeyword.value
    ? listSearchPagination.value
    : listCategoryPagination.value,
)

const currentMapPagination = computed(() =>
  appliedKeyword.value
    ? searchPagination.value
    : categoryPagination.value,
)

const listHasMoreOnServer = computed(() =>
  selectedCategories.value.some(
    (category) => currentListPagination.value[category]?.hasMore,
  ),
)

const mapHasMoreOnServer = computed(() =>
  selectedCategories.value.some(
    (category) => currentMapPagination.value[category]?.hasMore,
  ),
)

const listAvailableTotal = computed(() => {
  if (imageOnly.value) return activeListLocations.value.length

  const totals = selectedCategories.value.map(
    (category) => currentListPagination.value[category]?.total,
  )

  if (
    totals.length &&
    totals.every((total) => Number.isFinite(Number(total)))
  ) {
    const serverTotal = totals.reduce(
      (sum, total) => sum + Number(total),
      0,
    )

    // 서버 total 값이 오래된 배포 코드 때문에 100으로 고정되어도
    // 실제로 추가 적재된 목록 수보다 작아지지 않도록 보정합니다.
    return Math.max(serverTotal, activeListLocations.value.length)
  }

  return activeListLocations.value.length
})

const mapAvailableTotal = computed(() => {
  if (imageOnly.value) return mapLoadedRawLocations.value.length

  const totals = selectedCategories.value.map(
    (category) => currentMapPagination.value[category]?.total,
  )

  if (
    totals.length &&
    totals.every((total) => Number.isFinite(Number(total)))
  ) {
    return totals.reduce((sum, total) => sum + Number(total), 0)
  }

  return mapLoadedRawLocations.value.length
})

const hasMoreListLocations = computed(
  () =>
    displayedListLocations.value.length < activeListLocations.value.length ||
    listHasMoreOnServer.value,
)

const currentResultCount = computed(() =>
  activeTab.value === 'list'
    ? listAvailableTotal.value
    : visibleLocations.value.length,
)

const currentResultLabel = computed(() =>
  activeTab.value === 'list'
    ? '전체 목록 결과'
    : '현재 화면 핀',
)

const selectedCategoryLabels = computed(() =>
  selectedCategories.value.map(
    (category) => categoryMap[category]?.label || category,
  ),
)

const weatherEmoji = computed(() => {
  const condition = String(weather.value?.weather_condition || '')

  if (/천둥|번개/.test(condition)) return '⛈️'
  if (/눈/.test(condition)) return '🌨️'
  if (/비|소나기/.test(condition)) return '🌧️'
  if (/안개/.test(condition)) return '🌫️'
  if (/흐림|구름/.test(condition)) return '☁️'
  return '☀️'
})

const weatherGradeClass = computed(() => {
  const grade = weather.value?.travel_grade

  if (grade === '매우 좋음') return 'excellent'
  if (grade === '좋음') return 'good'
  if (grade === '보통') return 'normal'
  if (grade === '주의') return 'caution'
  return 'bad'
})

const routeReady = computed(
  () => routeStart.value && routeEnd.value && !routeLoading.value,
)

const selectedAddress = computed(() =>
  joinAddress(selectedPlace.value?.addr1, selectedPlace.value?.addr2),
)

const selectedImage = computed(() => {
  if (selectedImageFailed.value) return null

  return normalizeImageUrl(
    selectedPlace.value?.first_image ||
      selectedPlace.value?.thumbnail_image,
  )
})

const selectedClassifications = computed(() => {
  if (!selectedPlace.value) return []

  return [
    selectedPlace.value.class_system1,
    selectedPlace.value.class_system2,
    selectedPlace.value.class_system3,
  ]
    .map((value) => String(value || '').trim())
    .filter(Boolean)
    .filter((value, index, values) => values.indexOf(value) === index)
})

function categoryConfig(category) {
  return categoryMap[category] || {
    id: category,
    label: category || '기타',
    emoji: '📍',
    color: '#64748b',
  }
}

function joinAddress(...parts) {
  return parts
    .map((part) => String(part || '').trim())
    .filter(Boolean)
    .join(' ')
}

function normalizeImageUrl(value) {
  const url = String(value || '').trim()

  if (!url) return null
  if (url.startsWith('http://')) {
    return `https://${url.slice('http://'.length)}`
  }

  return url
}

function getListImage(location) {
  return normalizeImageUrl(
    location?.thumbnail_image || location?.first_image,
  )
}

function getLocationAddress(location) {
  return joinAddress(location?.addr1, location?.addr2)
}

function isListImageFailed(location) {
  return Boolean(listImageFailures.value[String(location?.content_id)])
}

function handleListImageError(location) {
  listImageFailures.value = {
    ...listImageFailures.value,
    [String(location?.content_id)]: true,
  }
}

async function loadMoreListLocations() {
  if (listMoreLoading.value) return

  listMoreLoading.value = true
  listError.value = ''

  try {
    // [수정] 더 보기를 누를 때마다 서버의 다음 페이지를 즉시 요청합니다.
    // 기존처럼 100개 버퍼를 거의 다 본 뒤에야 요청하지 않으므로,
    // 카테고리 하나만 선택해도 100 → 200 → 300건으로 계속 확장됩니다.
    if (listHasMoreOnServer.value) {
      await loadNextListPages()
    }

    // 서버에서 받아온 데이터 중 화면에는 24개씩 추가 표시합니다.
    listDisplayLimit.value = Math.min(
      listDisplayLimit.value + LIST_MORE_SIZE,
      activeListLocations.value.length,
    )
  } catch (error) {
    console.error('[목록 다음 페이지 불러오기 실패]', error)
    listError.value =
      error.message || '다음 장소 목록을 불러오지 못했습니다.'
  } finally {
    listMoreLoading.value = false
  }
}

function hasValidCoordinates(location) {
  return (
    Number.isFinite(Number(location?.latitude)) &&
    Number.isFinite(Number(location?.longitude))
  )
}


// [추가] Leaflet의 현재 화면 경계를 Vue에서 사용할 수 있는 값으로 저장합니다.
function updateMapViewport() {
  if (!leafletMap) return

  const bounds = leafletMap.getBounds()

  mapViewport.value = {
    north: bounds.getNorth(),
    south: bounds.getSouth(),
    east: bounds.getEast(),
    west: bounds.getWest(),
  }
}

// [추가] 장소가 현재 지도 화면 안에 있는지 확인합니다.
function isLocationInViewport(location) {
  if (!hasValidCoordinates(location)) return false
  if (!mapViewport.value) return true

  const latitude = Number(location.latitude)
  const longitude = Number(location.longitude)
  const { north, south, east, west } = mapViewport.value

  return (
    latitude <= north &&
    latitude >= south &&
    longitude <= east &&
    longitude >= west
  )
}

// [추가] 사용자가 지도를 이동하거나 확대·축소하면
// 네트워크 요청 없이 캐시된 데이터 중 현재 화면 안의 핀만 다시 그립니다.
async function handleViewportChanged() {
  updateMapViewport()
  await nextTick()
  await renderMarkers({ fit: false })
}

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;')
}

function formatObservedAt(value) {
  if (!value) return ''

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return String(value)

  return new Intl.DateTimeFormat('ko-KR', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date)
}

function formatDistance(meters) {
  const value = Number(meters)
  if (!Number.isFinite(value)) return '-'
  if (value >= 1000) return `${(value / 1000).toFixed(1)}km`
  return `${Math.round(value)}m`
}

function formatMinutes(minutes) {
  const value = Math.max(0, Number(minutes) || 0)
  const hours = Math.floor(value / 60)
  const rest = Math.round(value % 60)

  if (!hours) return `${rest}분`
  if (!rest) return `${hours}시간`
  return `${hours}시간 ${rest}분`
}

function formatFare(value) {
  const amount = Number(value)
  if (!Number.isFinite(amount) || amount <= 0) return '정보 없음'
  return `${amount.toLocaleString('ko-KR')}원`
}

function loadExternalStylesheet(id, href) {
  return new Promise((resolve, reject) => {
    const existing = document.getElementById(id)

    if (existing) {
      resolve()
      return
    }

    const link = document.createElement('link')
    link.id = id
    link.rel = 'stylesheet'
    link.href = href
    link.onload = resolve
    link.onerror = () => reject(new Error('Leaflet 스타일 로드 실패'))
    document.head.appendChild(link)
  })
}

function loadExternalScript(id, src) {
  return new Promise((resolve, reject) => {
    if (window.L) {
      resolve(window.L)
      return
    }

    const existing = document.getElementById(id)

    if (existing) {
      existing.addEventListener('load', () => resolve(window.L), {
        once: true,
      })
      existing.addEventListener(
        'error',
        () => reject(new Error('Leaflet 스크립트 로드 실패')),
        { once: true },
      )
      return
    }

    const script = document.createElement('script')
    script.id = id
    script.src = src
    script.async = true
    script.onload = () => resolve(window.L)
    script.onerror = () => reject(new Error('Leaflet 스크립트 로드 실패'))
    document.head.appendChild(script)
  })
}

async function loadLeaflet() {
  await Promise.all([
    loadExternalStylesheet('localhub-leaflet-css', LEAFLET_CSS_URL),
    loadExternalScript('localhub-leaflet-js', LEAFLET_JS_URL),
  ])

  if (!window.L) {
    throw new Error('Leaflet 객체를 찾을 수 없습니다.')
  }

  return window.L
}

function initializeMap() {
  const L = window.L

  leafletMap = L.map(mapElement.value, {
    center: SEOUL_CENTER,
    zoom: 12,
    zoomControl: true,
  })

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution:
      '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
  }).addTo(leafletMap)

  markerLayer = L.layerGroup().addTo(leafletMap)
  routeLayer = L.layerGroup().addTo(leafletMap)
  currentLocationLayer = L.layerGroup().addTo(leafletMap)

  // [추가] 최초 화면 범위를 저장하고, 이후 지도 이동/줌 변경을 감지합니다.
  updateMapViewport()
  leafletMap.on('moveend zoomend', handleViewportChanged)

  mapReady.value = true
}

async function fetchJson(url, options = {}) {
  const response = await fetch(url, options)
  const data = await response.json().catch(() => null)

  if (!response.ok) {
    const detail = data?.detail
    throw new Error(
      typeof detail === 'string'
        ? detail
        : `요청에 실패했습니다. (${response.status})`,
    )
  }

  return data
}

function normalizePageResponse(data, requestedPage, requestedSize) {
  const items = Array.isArray(data)
    ? data
    : Array.isArray(data?.items)
      ? data.items
      : []

  const page = Number(data?.page) || requestedPage
  const size = Number(data?.size) || requestedSize

  const rawTotal = Number(data?.total)
  const total = Number.isFinite(rawTotal) ? rawTotal : null

  const rawTotalPages = Number(
    data?.total_pages ?? data?.pages,
  )
  const totalPages = Number.isFinite(rawTotalPages)
    ? rawTotalPages
    : total !== null
      ? Math.ceil(total / size)
      : null

  // [수정] 일부 배포 환경에서 total/total_pages가 현재 페이지 크기처럼
  // 잘못 내려와도 100건을 꽉 채워 받았다면 다음 페이지를 한 번 더 확인합니다.
  // 마지막 페이지가 정확히 100건인 경우에는 다음 빈 페이지를 한 번 요청한 뒤 종료됩니다.
  const serverHasNextPage =
    totalPages !== null && page < totalPages
  const currentPageIsFull = items.length >= size
  const hasMore = serverHasNextPage || currentPageIsFull

  return {
    items,
    page,
    size,
    total,
    totalPages,
    hasMore,
  }
}

function mergeLocationItems(currentItems = [], nextItems = []) {
  const unique = new Map()

  ;[...currentItems, ...nextItems].forEach((location) => {
    unique.set(String(location.content_id), location)
  })

  return [...unique.values()]
}

function replaceCategoryItems(sourceItems, category, items) {
  return [
    ...sourceItems.filter((location) => location.category !== category),
    ...items,
  ]
}

async function fetchLocationPage(
  category,
  keyword = '',
  page = 1,
  size = LIST_FETCH_SIZE,
) {
  const params = new URLSearchParams({
    category,
    page: String(page),
    size: String(size),
  })

  if (keyword) {
    params.set('keyword', keyword)
  }

  const data = await fetchJson(`${API.LOCATIONS}?${params}`)
  return normalizePageResponse(data, page, size)
}

/**
 * 지도 데이터
 *
 * 기존 /api/locations/map?limit=500 방식은 카테고리당 최대 500건까지만
 * 반환하므로 관광지·쇼핑·음식점 전체를 가져올 수 없습니다.
 *
 * 이제 지도도 /api/locations의 page/size를 사용해 다음 페이지를
 * 계속 불러오고, 좌표가 있는 항목만 핀으로 렌더링합니다.
 */
async function ensureCategoryLoaded(category) {
  if (categoryCache.value[category]) return
  if (categoryLoading.value[category]) return

  categoryLoading.value = {
    ...categoryLoading.value,
    [category]: true,
  }

  try {
    const result = await fetchLocationPage(
      category,
      '',
      1,
      MAP_FETCH_SIZE,
    )

    categoryCache.value = {
      ...categoryCache.value,
      [category]: result.items,
    }
    categoryPagination.value = {
      ...categoryPagination.value,
      [category]: result,
    }
  } finally {
    categoryLoading.value = {
      ...categoryLoading.value,
      [category]: false,
    }
  }
}

async function ensureMapSearchCategoryLoaded(category) {
  if (searchPagination.value[category]) return
  if (categoryLoading.value[category]) return

  categoryLoading.value = {
    ...categoryLoading.value,
    [category]: true,
  }

  try {
    const result = await fetchLocationPage(
      category,
      appliedKeyword.value,
      1,
      MAP_FETCH_SIZE,
    )

    searchResults.value = replaceCategoryItems(
      searchResults.value,
      category,
      result.items,
    )
    searchPagination.value = {
      ...searchPagination.value,
      [category]: result,
    }
  } finally {
    categoryLoading.value = {
      ...categoryLoading.value,
      [category]: false,
    }
  }
}

async function loadNextMapPageForCategory(category) {
  const pagination = appliedKeyword.value
    ? searchPagination.value
    : categoryPagination.value

  const current = pagination[category]

  if (!current?.hasMore || categoryLoading.value[category]) {
    return
  }

  categoryLoading.value = {
    ...categoryLoading.value,
    [category]: true,
  }

  try {
    const result = await fetchLocationPage(
      category,
      appliedKeyword.value,
      current.page + 1,
      MAP_FETCH_SIZE,
    )

    if (appliedKeyword.value) {
      const currentCategoryItems = searchResults.value.filter(
        (location) => location.category === category,
      )
      const merged = mergeLocationItems(
        currentCategoryItems,
        result.items,
      )
      const addedCount =
        merged.length - currentCategoryItems.length

      searchResults.value = replaceCategoryItems(
        searchResults.value,
        category,
        merged,
      )
      searchPagination.value = {
        ...searchPagination.value,
        [category]: {
          ...result,
          hasMore: result.hasMore && addedCount > 0,
        },
      }
    } else {
      const currentCategoryItems =
        categoryCache.value[category] || []
      const merged = mergeLocationItems(
        currentCategoryItems,
        result.items,
      )
      const addedCount =
        merged.length - currentCategoryItems.length

      categoryCache.value = {
        ...categoryCache.value,
        [category]: merged,
      }
      categoryPagination.value = {
        ...categoryPagination.value,
        [category]: {
          ...result,
          hasMore: result.hasMore && addedCount > 0,
        },
      }
    }
  } finally {
    categoryLoading.value = {
      ...categoryLoading.value,
      [category]: false,
    }
  }
}

async function loadNextMapPages() {
  const pagination = appliedKeyword.value
    ? searchPagination.value
    : categoryPagination.value

  const categories = selectedCategories.value.filter(
    (category) => pagination[category]?.hasMore,
  )

  await Promise.all(
    categories.map((category) =>
      loadNextMapPageForCategory(category),
    ),
  )

  return categories.length
}

async function loadMoreMapLocations() {
  if (mapMoreLoading.value || mapAllLoading.value) return

  mapMoreLoading.value = true
  dataError.value = ''

  try {
    await loadNextMapPages()
    await nextTick()
    await renderMarkers({ fit: false })
  } catch (error) {
    console.error('[지도 다음 페이지 불러오기 실패]', error)
    dataError.value =
      error.message || '다음 지도 데이터를 불러오지 못했습니다.'
  } finally {
    mapMoreLoading.value = false
  }
}

async function loadAllMapLocations() {
  if (mapAllLoading.value || mapMoreLoading.value) return

  mapAllLoading.value = true
  dataError.value = ''

  try {
    let safetyCounter = 0

    while (mapHasMoreOnServer.value && safetyCounter < 100) {
      const loadedCategoryCount = await loadNextMapPages()

      if (!loadedCategoryCount) break
      safetyCounter += 1
    }

    await nextTick()
    await renderMarkers({ fit: false })
  } catch (error) {
    console.error('[지도 전체 데이터 불러오기 실패]', error)
    dataError.value =
      error.message || '전체 지도 데이터를 불러오지 못했습니다.'
  } finally {
    mapAllLoading.value = false
  }
}

/**
 * 목록 데이터
 *
 * 첫 페이지 100건만 유지하지 않고, 더 보기 시 다음 page를 실제로
 * 요청해 기존 결과 뒤에 이어 붙입니다.
 */
async function ensureListCategoryLoaded(category) {
  if (listCategoryCache.value[category]) return
  if (listCategoryLoading.value[category]) return

  listCategoryLoading.value = {
    ...listCategoryLoading.value,
    [category]: true,
  }

  try {
    const result = await fetchLocationPage(
      category,
      '',
      1,
      LIST_FETCH_SIZE,
    )

    listCategoryCache.value = {
      ...listCategoryCache.value,
      [category]: result.items,
    }
    listCategoryPagination.value = {
      ...listCategoryPagination.value,
      [category]: result,
    }
  } finally {
    listCategoryLoading.value = {
      ...listCategoryLoading.value,
      [category]: false,
    }
  }
}

async function ensureListSearchCategoryLoaded(category) {
  if (listSearchPagination.value[category]) return
  if (listCategoryLoading.value[category]) return

  listCategoryLoading.value = {
    ...listCategoryLoading.value,
    [category]: true,
  }

  try {
    const result = await fetchLocationPage(
      category,
      appliedKeyword.value,
      1,
      LIST_FETCH_SIZE,
    )

    listSearchResults.value = replaceCategoryItems(
      listSearchResults.value,
      category,
      result.items,
    )
    listSearchPagination.value = {
      ...listSearchPagination.value,
      [category]: result,
    }
  } finally {
    listCategoryLoading.value = {
      ...listCategoryLoading.value,
      [category]: false,
    }
  }
}

async function loadNextListPageForCategory(category) {
  const pagination = appliedKeyword.value
    ? listSearchPagination.value
    : listCategoryPagination.value

  const current = pagination[category]

  if (!current?.hasMore || listCategoryLoading.value[category]) {
    return
  }

  listCategoryLoading.value = {
    ...listCategoryLoading.value,
    [category]: true,
  }

  try {
    const result = await fetchLocationPage(
      category,
      appliedKeyword.value,
      current.page + 1,
      LIST_FETCH_SIZE,
    )

    if (appliedKeyword.value) {
      const currentCategoryItems = listSearchResults.value.filter(
        (location) => location.category === category,
      )
      const merged = mergeLocationItems(
        currentCategoryItems,
        result.items,
      )
      const addedCount =
        merged.length - currentCategoryItems.length

      listSearchResults.value = replaceCategoryItems(
        listSearchResults.value,
        category,
        merged,
      )
      listSearchPagination.value = {
        ...listSearchPagination.value,
        [category]: {
          ...result,
          // 같은 페이지가 반복 반환되면 무한 요청하지 않습니다.
          hasMore: result.hasMore && addedCount > 0,
        },
      }
    } else {
      const currentCategoryItems =
        listCategoryCache.value[category] || []
      const merged = mergeLocationItems(
        currentCategoryItems,
        result.items,
      )
      const addedCount =
        merged.length - currentCategoryItems.length

      listCategoryCache.value = {
        ...listCategoryCache.value,
        [category]: merged,
      }
      listCategoryPagination.value = {
        ...listCategoryPagination.value,
        [category]: {
          ...result,
          hasMore: result.hasMore && addedCount > 0,
        },
      }
    }
  } finally {
    listCategoryLoading.value = {
      ...listCategoryLoading.value,
      [category]: false,
    }
  }
}

async function loadNextListPages() {
  const pagination = appliedKeyword.value
    ? listSearchPagination.value
    : listCategoryPagination.value

  const categories = selectedCategories.value.filter(
    (category) => pagination[category]?.hasMore,
  )

  await Promise.all(
    categories.map((category) =>
      loadNextListPageForCategory(category),
    ),
  )
}

async function loadSelectedListData({ resetSearch = false } = {}) {
  listError.value = ''
  listLoading.value = true
  listDisplayLimit.value = LIST_INITIAL_LIMIT

  try {
    if (appliedKeyword.value) {
      if (resetSearch) {
        listSearchResults.value = []
        listSearchPagination.value = {}
      }

      await Promise.all(
        selectedCategories.value.map((category) =>
          ensureListSearchCategoryLoaded(category),
        ),
      )
    } else {
      await Promise.all(
        selectedCategories.value.map((category) =>
          ensureListCategoryLoaded(category),
        ),
      )

      listSearchResults.value = []
      listSearchPagination.value = {}
    }
  } catch (error) {
    console.error('[목록 데이터 불러오기 실패]', error)
    listError.value = error.message || '장소 목록을 불러오지 못했습니다.'
  } finally {
    listLoading.value = false
  }
}

async function loadSelectedCategoryData({
  fit = true,
  resetSearch = false,
} = {}) {
  if (!mapReady.value) return

  dataError.value = ''
  mapLoading.value = true

  try {
    if (appliedKeyword.value) {
      if (resetSearch) {
        searchResults.value = []
        searchPagination.value = {}
      }

      await Promise.all(
        selectedCategories.value.map((category) =>
          ensureMapSearchCategoryLoaded(category),
        ),
      )
    } else {
      await Promise.all(
        selectedCategories.value.map((category) =>
          ensureCategoryLoaded(category),
        ),
      )

      searchResults.value = []
      searchPagination.value = {}
    }

    await nextTick()
    await renderMarkers({ fit })
  } catch (error) {
    console.error('[지도 데이터 불러오기 실패]', error)
    dataError.value = error.message || '장소 정보를 불러오지 못했습니다.'
  } finally {
    mapLoading.value = false
  }
}

function createMarkerIcon(location) {
  const L = window.L
  const config = categoryConfig(location.category)

  return L.divIcon({
    className: 'localhub-marker-wrapper',
    html: `
      <div
        class="localhub-map-pin"
        style="--pin-color:${config.color}"
        title="${escapeHtml(location.title)}"
        aria-label="${escapeHtml(location.title)}"
      >
        <span>${config.emoji}</span>
      </div>
    `,
    iconSize: [38, 46],
    iconAnchor: [19, 43],
    popupAnchor: [0, -40],
  })
}

function createPopupHtml(location) {
  const config = categoryConfig(location.category)
  const address = location.addr1 || '주소 정보 없음'

  return `
    <div class="localhub-popup">
      <span class="localhub-popup-category" style="color:${config.color}">
        ${escapeHtml(config.label)}
      </span>
      <strong>${escapeHtml(location.title)}</strong>
      <p>${escapeHtml(address)}</p>
      <small>핀을 선택하면 상세 정보를 확인할 수 있어요.</small>
    </div>
  `
}

async function renderMarkers({ fit = false } = {}) {
  if (!mapReady.value || !leafletMap || !markerLayer) return

  const currentSequence = ++renderMarkerSequence
  const L = window.L

  markerLayer.clearLayers()
  markerById = new Map()

  const bounds = []

  visibleLocations.value.forEach((location) => {
    if (currentSequence !== renderMarkerSequence) return

    const latitude = Number(location.latitude)
    const longitude = Number(location.longitude)
    const marker = L.marker([latitude, longitude], {
      icon: createMarkerIcon(location),
      keyboard: true,
      title: location.title,
    })

    marker.bindPopup(createPopupHtml(location), {
      maxWidth: 280,
      closeButton: true,
    })

    marker.on('click', () => {
      selectLocation(location)
    })

    marker.addTo(markerLayer)
    markerById.set(String(location.content_id), marker)
    bounds.push([latitude, longitude])
  })

  if (fit && bounds.length) {
    leafletMap.fitBounds(bounds, {
      padding: [40, 40],
      maxZoom: 15,
    })
  }
}

async function selectLocation(location) {
  const id = String(location.content_id)

  selectedPlace.value = {
    ...location,
    first_image: location.first_image || null,
  }
  detailError.value = ''

  if (hasValidCoordinates(location) && leafletMap) {
    leafletMap.panTo(
      [Number(location.latitude), Number(location.longitude)],
      { animate: true },
    )
  }

  const marker = markerById.get(id)
  marker?.openPopup()

  if (detailCache.has(id)) {
    selectedPlace.value = detailCache.get(id)
    return
  }

  detailLoading.value = true

  try {
    const detail = await fetchJson(
      `${API.LOCATIONS}/${encodeURIComponent(id)}`,
    )
    detailCache.set(id, detail)
    selectedPlace.value = detail
  } catch (error) {
    console.error('[장소 상세 불러오기 실패]', error)
    detailError.value = error.message || '상세 정보를 불러오지 못했습니다.'
  } finally {
    detailLoading.value = false
  }
}

async function ensureMapInitialized() {
  if (mapReady.value) {
    await nextTick()
    leafletMap?.invalidateSize()

    // [수정] 지도 탭으로 다시 들어왔을 때 아직 남은 페이지가 있다면
    // 선택된 카테고리의 지도 데이터를 끝까지 불러옵니다.
    if (mapHasMoreOnServer.value) {
      await loadAllMapLocations()
    }

    updateMapViewport()
    await renderMarkers({ fit: false })
    return
  }

  mapLoading.value = true
  mapError.value = ''

  try {
    await loadLeaflet()
    await nextTick()
    initializeMap()

    // [수정] 각 카테고리의 첫 페이지를 준비한 뒤,
    // 목록 로직은 그대로 두고 지도 데이터만 마지막 페이지까지 자동 적재합니다.
    await loadSelectedCategoryData({ fit: false })
    await loadAllMapLocations()

    await nextTick()
    leafletMap?.invalidateSize()
    updateMapViewport()
    await renderMarkers({ fit: false })
  } catch (error) {
    console.error('[지도 초기화 실패]', error)
    mapError.value = error.message || '지도를 초기화하지 못했습니다.'
  } finally {
    mapLoading.value = false
  }
}

async function switchTab(tab) {
  activeTab.value = tab

  if (tab === 'map') {
    await nextTick()
    await ensureMapInitialized()
  }
}

async function focusLocation(location) {
  await selectLocation(location)
  await nextTick()

  const marker = markerById.get(String(location.content_id))
  marker?.openPopup()
}

async function openLocationOnMap(location) {
  if (!hasValidCoordinates(location)) return

  await switchTab('map')

  leafletMap?.setView(
    [Number(location.latitude), Number(location.longitude)],
    15,
    { animate: false },
  )

  updateMapViewport()
  await nextTick()
  await renderMarkers({ fit: false })
  await focusLocation(location)
}

async function setRoutePointFromList(type, location) {
  if (!hasValidCoordinates(location)) return

  const point = createRoutePoint(location)

  if (type === 'start') {
    routeStart.value = point
  } else {
    routeEnd.value = point
  }

  routeError.value = ''
  routeInfo.value = null
  clearRouteLayer()

  await openLocationOnMap(location)
}

async function toggleCategory(category) {
  const exists = selectedCategories.value.includes(category)

  if (exists) {
    if (selectedCategories.value.length === 1) return
    selectedCategories.value = selectedCategories.value.filter(
      (item) => item !== category,
    )
  } else {
    selectedCategories.value = [...selectedCategories.value, category]
  }

  await loadSelectedListData()

  // [수정] 카테고리를 바꿔도 현재 중심과 줌을 유지하면서,
  // 새로 선택된 카테고리의 지도 데이터는 마지막 페이지까지 불러옵니다.
  if (mapReady.value) {
    await loadSelectedCategoryData({ fit: false })
    await loadAllMapLocations()
  }
}

async function toggleAllCategories() {
  selectedCategories.value = allCategoriesSelected.value
    ? [...INITIAL_CATEGORIES]
    : CATEGORY_CONFIG.map((category) => category.id)

  await loadSelectedListData()

  // [수정] 전체/기본 카테고리를 바꿔도 현재 중심과 줌을 유지하면서,
  // 선택된 모든 카테고리의 지도 데이터를 마지막 페이지까지 불러옵니다.
  if (mapReady.value) {
    await loadSelectedCategoryData({ fit: false })
    await loadAllMapLocations()
  }
}

async function applySearch() {
  appliedKeyword.value = searchInput.value.trim()

  await loadSelectedListData({
    resetSearch: true,
  })

  if (mapReady.value) {
    // [수정] 검색 결과도 첫 100건에서 멈추지 않고
    // 선택된 카테고리별 마지막 페이지까지 모두 불러옵니다.
    await loadSelectedCategoryData({
      fit: false,
      resetSearch: true,
    })
    await loadAllMapLocations()
    fitVisibleMarkers()
  }
}

async function clearSearch() {
  searchInput.value = ''
  appliedKeyword.value = ''

  searchResults.value = []
  searchPagination.value = {}
  listSearchResults.value = []
  listSearchPagination.value = {}

  await loadSelectedListData()

  // [수정] 검색을 지워도 현재 보고 있던 지도 위치를 유지하면서,
  // 기본 카테고리 데이터도 마지막 페이지까지 다시 확인합니다.
  if (mapReady.value) {
    await loadSelectedCategoryData({ fit: false })
    await loadAllMapLocations()
  }
}

function fitVisibleMarkers() {
  if (!leafletMap) return

  const bounds = activeLocations.value.map((location) => [
    Number(location.latitude),
    Number(location.longitude),
  ])

  if (!bounds.length) {
    leafletMap.setView(SEOUL_CENTER, 12)
    return
  }

  leafletMap.fitBounds(bounds, {
    padding: [40, 40],
    maxZoom: 15,
  })
}

function useCurrentLocation() {
  if (!navigator.geolocation) {
    mapError.value = '이 브라우저에서는 현재 위치를 지원하지 않습니다.'
    return
  }

  mapError.value = ''

  navigator.geolocation.getCurrentPosition(
    (position) => {
      const location = {
        content_id: 'current-location',
        title: '현재 위치',
        category: '현재 위치',
        addr1: '브라우저에서 확인한 현재 위치',
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
      }

      routeStart.value = location
      drawCurrentLocation(location)
      leafletMap?.setView(
        [location.latitude, location.longitude],
        15,
        { animate: true },
      )
    },
    (error) => {
      console.error('[현재 위치 확인 실패]', error)
      mapError.value =
        '현재 위치를 확인하지 못했습니다. 브라우저 위치 권한을 확인해주세요.'
    },
    {
      enableHighAccuracy: true,
      timeout: 10_000,
      maximumAge: 60_000,
    },
  )
}

function drawCurrentLocation(location) {
  if (!window.L || !currentLocationLayer) return

  currentLocationLayer.clearLayers()

  const marker = window.L.circleMarker(
    [Number(location.latitude), Number(location.longitude)],
    {
      radius: 9,
      color: '#ffffff',
      weight: 3,
      fillColor: '#2563eb',
      fillOpacity: 1,
    },
  )

  marker.bindTooltip('현재 위치', {
    permanent: false,
    direction: 'top',
  })
  marker.addTo(currentLocationLayer)
}

function createRoutePoint(place) {
  return {
    content_id: String(place.content_id),
    title: place.title,
    category: place.category,
    addr1: place.addr1,
    addr2: place.addr2,
    latitude: Number(place.latitude),
    longitude: Number(place.longitude),
  }
}

function setRoutePoint(type) {
  if (!selectedPlace.value || !hasValidCoordinates(selectedPlace.value)) {
    routeError.value = '좌표가 있는 장소를 먼저 선택해주세요.'
    return
  }

  const point = createRoutePoint(selectedPlace.value)

  if (type === 'start') {
    routeStart.value = point
  } else {
    routeEnd.value = point
  }

  routeError.value = ''
  routeInfo.value = null
  clearRouteLayer()
}

function swapRoutePoints() {
  const previousStart = routeStart.value
  routeStart.value = routeEnd.value
  routeEnd.value = previousStart
  routeInfo.value = null
  routeError.value = ''
  clearRouteLayer()
}

function clearRoute() {
  routeStart.value = null
  routeEnd.value = null
  routeInfo.value = null
  routeError.value = ''
  clearRouteLayer()
}

function clearRouteLayer() {
  routeLayer?.clearLayers()
}

function haversineDistance(start, end) {
  const radius = 6_371_000
  const toRadians = (degree) => (degree * Math.PI) / 180
  const latitude1 = toRadians(Number(start.latitude))
  const latitude2 = toRadians(Number(end.latitude))
  const deltaLatitude = toRadians(
    Number(end.latitude) - Number(start.latitude),
  )
  const deltaLongitude = toRadians(
    Number(end.longitude) - Number(start.longitude),
  )

  const a =
    Math.sin(deltaLatitude / 2) ** 2 +
    Math.cos(latitude1) *
      Math.cos(latitude2) *
      Math.sin(deltaLongitude / 2) ** 2

  return radius * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

function drawFallbackRoute() {
  if (!window.L || !routeLayer || !routeStart.value || !routeEnd.value) {
    return
  }

  clearRouteLayer()

  const points = [
    [routeStart.value.latitude, routeStart.value.longitude],
    [routeEnd.value.latitude, routeEnd.value.longitude],
  ]

  const line = window.L.polyline(points, {
    color: '#2563eb',
    weight: 4,
    opacity: 0.75,
    dashArray: '10 9',
  }).addTo(routeLayer)

  drawRouteEndpoint(routeStart.value, '출발', '#2563eb')
  drawRouteEndpoint(routeEnd.value, '도착', '#ef4444')

  leafletMap?.fitBounds(line.getBounds(), {
    padding: [60, 60],
    maxZoom: 15,
  })
}

function drawRouteEndpoint(point, label, color) {
  const marker = window.L.circleMarker(
    [Number(point.latitude), Number(point.longitude)],
    {
      radius: 9,
      color: '#ffffff',
      weight: 3,
      fillColor: color,
      fillOpacity: 1,
    },
  )

  marker.bindTooltip(`${label} · ${point.title}`, {
    permanent: false,
    direction: 'top',
  })
  marker.addTo(routeLayer)
}

function normalizeRouteSteps(subPaths = []) {
  return subPaths.map((step, index) => {
    const type = Number(step.trafficType)
    const laneNames = Array.isArray(step.lane)
      ? step.lane
          .map((lane) => lane.name || lane.busNo)
          .filter(Boolean)
          .join(', ')
      : ''

    if (type === 1) {
      return {
        id: `subway-${index}`,
        type: '지하철',
        icon: '🚇',
        title: laneNames || '지하철 이동',
        description: joinAddress(step.startName, '→', step.endName),
        minutes: step.sectionTime,
        distance: step.distance,
      }
    }

    if (type === 2) {
      return {
        id: `bus-${index}`,
        type: '버스',
        icon: '🚌',
        title: laneNames || '버스 이동',
        description: joinAddress(step.startName, '→', step.endName),
        minutes: step.sectionTime,
        distance: step.distance,
      }
    }

    return {
      id: `walk-${index}`,
      type: '도보',
      icon: '🚶',
      title: '도보 이동',
      description:
        joinAddress(step.startName, '→', step.endName) ||
        `${formatDistance(step.distance)} 이동`,
      minutes: step.sectionTime,
      distance: step.distance,
    }
  })
}

function normalizeRouteInfo(path) {
  const info = path?.info || {}

  return {
    mode: 'odsay',
    totalTime: Number(info.totalTime) || 0,
    totalDistance: Number(info.totalDistance) || 0,
    payment: Number(info.payment) || 0,
    transferCount:
      (Number(info.busTransitCount) || 0) +
      (Number(info.subwayTransitCount) || 0),
    mapObject: info.mapObj || null,
    steps: normalizeRouteSteps(path?.subPath || []),
  }
}

async function requestOdsayRoute() {
  const params = new URLSearchParams({
    SX: String(routeStart.value.longitude),
    SY: String(routeStart.value.latitude),
    EX: String(routeEnd.value.longitude),
    EY: String(routeEnd.value.latitude),
    OPT: '0',
    SearchPathType: '0',
    apiKey: ODSAY_API_KEY,
  })

  const response = await fetch(
    `https://api.odsay.com/v1/api/searchPubTransPathT?${params}`,
  )
  const data = await response.json().catch(() => null)

  if (!response.ok) {
    throw new Error(`ODsay 경로 API 요청 실패 (${response.status})`)
  }

  if (data?.error) {
    throw new Error(
      data.error.msg || data.error.message || '경로를 찾지 못했습니다.',
    )
  }

  const paths = data?.result?.path

  if (!Array.isArray(paths) || !paths.length) {
    throw new Error('두 장소 사이의 대중교통 경로를 찾지 못했습니다.')
  }

  return paths[0]
}

async function requestRouteGeometry(mapObject) {
  const params = new URLSearchParams({
    mapObject: `0:0@${mapObject}`,
    apiKey: ODSAY_API_KEY,
  })

  const response = await fetch(
    `https://api.odsay.com/v1/api/loadLane?${params}`,
  )
  const data = await response.json().catch(() => null)

  if (!response.ok) {
    throw new Error(`ODsay 노선 그래픽 요청 실패 (${response.status})`)
  }

  if (data?.error) {
    throw new Error(
      data.error.msg || data.error.message || '노선 그래픽을 불러오지 못했습니다.',
    )
  }

  return data?.result || null
}

function drawOdsayGeometry(result) {
  if (!window.L || !routeLayer || !result) return false

  clearRouteLayer()

  const palette = [
    '#2563eb',
    '#059669',
    '#9333ea',
    '#ea580c',
    '#0891b2',
    '#e11d48',
  ]
  const allPoints = []
  let lineCount = 0

  ;(result.lane || []).forEach((lane, laneIndex) => {
    ;(lane.section || []).forEach((section) => {
      const points = (section.graphPos || [])
        .map((position) => [Number(position.y), Number(position.x)])
        .filter(
          ([latitude, longitude]) =>
            Number.isFinite(latitude) && Number.isFinite(longitude),
        )

      if (points.length < 2) return

      window.L.polyline(points, {
        color: palette[laneIndex % palette.length],
        weight: 5,
        opacity: 0.86,
        lineCap: 'round',
        lineJoin: 'round',
      }).addTo(routeLayer)

      allPoints.push(...points)
      lineCount += 1
    })
  })

  drawRouteEndpoint(routeStart.value, '출발', '#2563eb')
  drawRouteEndpoint(routeEnd.value, '도착', '#ef4444')

  if (allPoints.length) {
    leafletMap?.fitBounds(allPoints, {
      padding: [60, 60],
      maxZoom: 16,
    })
  }

  return lineCount > 0
}

async function findRoute() {
  if (!routeStart.value || !routeEnd.value) {
    routeError.value = '출발지와 도착지를 모두 선택해주세요.'
    return
  }

  if (routeStart.value.content_id === routeEnd.value.content_id) {
    routeError.value = '출발지와 도착지는 서로 다른 장소여야 합니다.'
    return
  }

  routeLoading.value = true
  routeError.value = ''
  routeInfo.value = null
  clearRouteLayer()

  try {
    if (!ODSAY_API_KEY) {
      const distance = haversineDistance(routeStart.value, routeEnd.value)
      routeInfo.value = {
        mode: 'preview',
        totalDistance: distance,
        steps: [],
      }
      routeError.value =
        'VITE_ODSAY_API_KEY가 없어 직선거리 미리보기만 표시합니다.'
      drawFallbackRoute()
      return
    }

    const path = await requestOdsayRoute()
    routeInfo.value = normalizeRouteInfo(path)

    let geometryDrawn = false

    if (routeInfo.value.mapObject) {
      try {
        const geometry = await requestRouteGeometry(
          routeInfo.value.mapObject,
        )
        geometryDrawn = drawOdsayGeometry(geometry)
      } catch (geometryError) {
        console.warn('[ODsay 노선 그래픽 불러오기 실패]', geometryError)
      }
    }

    if (!geometryDrawn) {
      drawFallbackRoute()
    }
  } catch (error) {
    console.error('[대중교통 경로 검색 실패]', error)
    routeError.value = error.message || '경로를 찾지 못했습니다.'

    const distance = haversineDistance(routeStart.value, routeEnd.value)
    routeInfo.value = {
      mode: 'preview',
      totalDistance: distance,
      steps: [],
    }
    drawFallbackRoute()
  } finally {
    routeLoading.value = false
  }
}

async function copyAddress() {
  if (!selectedAddress.value) return

  try {
    await navigator.clipboard.writeText(selectedAddress.value)
  } catch (error) {
    console.error('[주소 복사 실패]', error)
  }
}

function openKakaoMap(place) {
  if (!place || !hasValidCoordinates(place)) return

  const title = encodeURIComponent(place.title || '선택 장소')
  const latitude = Number(place.latitude)
  const longitude = Number(place.longitude)
  window.open(
    `https://map.kakao.com/link/map/${title},${latitude},${longitude}`,
    '_blank',
    'noopener,noreferrer',
  )
}

async function loadWeather() {
  weatherLoading.value = true
  weatherError.value = ''

  try {
    weather.value = await fetchJson(API.WEATHER)
  } catch (error) {
    console.error('[날씨 불러오기 실패]', error)
    weatherError.value = error.message || '날씨 정보를 불러오지 못했습니다.'
  } finally {
    weatherLoading.value = false
  }
}

watch(imageOnly, async () => {
  listDisplayLimit.value = LIST_INITIAL_LIMIT

  if (mapReady.value) {
    await nextTick()
    await renderMarkers({ fit: false })
  }
})

watch(
  () => selectedPlace.value?.content_id,
  () => {
    selectedImageFailed.value = false
  },
)

onMounted(async () => {
  await Promise.all([
    loadSelectedListData(),
    loadWeather(),
  ])

  // 홈의 지도 카드에서 들어온 경우 지도 탭을 바로 초기화
  if (activeTab.value === 'map') {
    await nextTick()
    await ensureMapInitialized()
  }
})

onBeforeUnmount(() => {
  renderMarkerSequence += 1
  markerById.clear()
  leafletMap?.remove()
  leafletMap = null
  markerLayer = null
  routeLayer = null
  currentLocationLayer = null
})
</script>

<template>
  <div class="map-page">
    <div class="breadcrumb">
      <span class="home-icon">🏠</span>
      홈
      <span class="arrow">&gt;</span>
      <span class="current">서울 여행 탐색</span>
    </div>

    <div class="page-header">
      <div>
        <span class="page-eyebrow">Explore Seoul</span>
        <h1 class="page-title">서울 여행지를 한눈에 탐색하세요</h1>
        <p class="page-desc">
          사진 중심 목록과 카테고리별 지도 핀을 자유롭게 전환하고,
          두 장소 사이의 대중교통 경로까지 확인해보세요.
        </p>
      </div>
      <div class="header-stat">
        <strong>{{ currentResultCount.toLocaleString('ko-KR') }}</strong>
        <span>{{ currentResultLabel }}</span>
      </div>
    </div>

    <section class="weather-card" :class="weatherGradeClass">
      <div v-if="weatherLoading" class="weather-loading">
        <span class="loading-spinner" />
        오늘의 서울 날씨를 확인하고 있어요.
      </div>

      <template v-else-if="weather">
        <div class="weather-main">
          <div class="weather-icon" aria-hidden="true">{{ weatherEmoji }}</div>
          <div>
            <span class="weather-label">오늘의 서울</span>
            <div class="weather-temperature-row">
              <strong>{{ weather.temperature }}°</strong>
              <span>{{ weather.weather_condition }}</span>
            </div>
            <p>{{ weather.recommendation }}</p>
          </div>
        </div>

        <div class="weather-metrics">
          <div class="weather-score">
            <div class="score-circle">
              <strong>{{ weather.travel_score }}</strong>
              <span>점</span>
            </div>
            <div>
              <span>여행 적합도</span>
              <strong>{{ weather.travel_grade }}</strong>
            </div>
          </div>
          <div class="metric-divider" />
          <div class="metric-item">
            <span>체감</span>
            <strong>{{ weather.feels_like ?? '-' }}°</strong>
          </div>
          <div class="metric-item">
            <span>습도</span>
            <strong>{{ weather.humidity }}%</strong>
          </div>
          <div class="metric-item">
            <span>강수</span>
            <strong>{{ weather.precipitation }}mm</strong>
          </div>
          <div class="metric-item observed-at">
            <span>관측</span>
            <strong>{{ formatObservedAt(weather.observed_at) }}</strong>
          </div>
        </div>
      </template>

      <div v-else class="weather-error">
        <span>🌥️</span>
        <div>
          <strong>날씨 정보를 표시하지 못했어요.</strong>
          <p>{{ weatherError }}</p>
        </div>
        <button type="button" @click="loadWeather">다시 불러오기</button>
      </div>
    </section>

    <section class="map-toolbar-card">
      <div class="search-row">
        <div class="search-input-wrapper">
          <span class="search-icon">🔍</span>
          <input
            v-model="searchInput"
            type="search"
            placeholder="장소명이나 주소를 검색해보세요"
            @keyup.enter="applySearch"
          />
          <button
            v-if="searchInput || appliedKeyword"
            class="input-clear"
            type="button"
            aria-label="검색어 지우기"
            @click="clearSearch"
          >
            ×
          </button>
        </div>
        <button class="primary-btn" type="button" @click="applySearch">
          검색
        </button>
        <button
          v-if="activeTab === 'map'"
          class="secondary-btn"
          type="button"
          @click="useCurrentLocation"
        >
          ◎ 내 위치
        </button>
        <button
          v-if="activeTab === 'map'"
          class="secondary-btn"
          type="button"
          @click="fitVisibleMarkers"
        >
          ⛶ 전체 보기
        </button>
      </div>

      <div class="filter-row">
        <div class="category-filters" aria-label="지도 카테고리 필터">
          <button
            v-for="category in CATEGORY_CONFIG"
            :key="category.id"
            type="button"
            class="category-chip"
            :class="{ active: selectedCategories.includes(category.id) }"
            :aria-pressed="selectedCategories.includes(category.id)"
            @click="toggleCategory(category.id)"
          >
            <span
              class="category-dot"
              :style="{ backgroundColor: category.color }"
            />
            <span>{{ category.emoji }}</span>
            {{ category.label }}
            <span
              v-if="categoryLoading[category.id] || listCategoryLoading[category.id]"
              class="chip-loading"
              aria-label="불러오는 중"
            />
          </button>
        </div>

        <div class="filter-actions">
          <label class="image-filter">
            <input v-model="imageOnly" type="checkbox" />
            <span>사진 있는 장소만</span>
          </label>
          <button class="text-btn" type="button" @click="toggleAllCategories">
            {{ allCategoriesSelected ? '기본만 보기' : '전체 카테고리' }}
          </button>
        </div>
      </div>

      <div v-if="appliedKeyword" class="search-summary">
        <strong>“{{ appliedKeyword }}”</strong> 검색 결과
        {{ activeTab === 'list' ? listAvailableTotal : visibleLocations.length }}개 ·
        {{ selectedCategoryLabels.join(', ') }}
      </div>
    </section>

    <nav class="view-tabs" aria-label="장소 보기 방식">
      <button
        type="button"
        class="view-tab"
        :class="{ active: activeTab === 'list' }"
        :aria-selected="activeTab === 'list'"
        @click="switchTab('list')"
      >
        <span class="tab-icon">▦</span>
        목록으로 보기
        <strong>{{ listAvailableTotal }}</strong>
      </button>
      <button
        type="button"
        class="view-tab"
        :class="{ active: activeTab === 'map' }"
        :aria-selected="activeTab === 'map'"
        @click="switchTab('map')"
      >
        <span class="tab-icon">🗺️</span>
        지도에서 보기
        <strong>{{ activeLocations.length }}</strong>
      </button>
    </nav>

    <!-- [추가] 전체 결과와 실제 지도 핀 수를 구분해 표시합니다. -->
    <section
      v-if="activeTab === 'map'"
      class="map-data-status"
    >
      <div class="map-data-copy">
        <strong>지도 데이터 불러오기</strong>
        <span>
          전체 결과 {{ mapAvailableTotal.toLocaleString('ko-KR') }}개 ·
          현재 불러온 데이터 {{ mapLoadedRawLocations.length.toLocaleString('ko-KR') }}개 ·
          좌표 보유 {{ activeLocations.length.toLocaleString('ko-KR') }}개 ·
          현재 화면 {{ visibleLocations.length.toLocaleString('ko-KR') }}개
        </span>
        <small>
          주소만 있고 좌표가 없는 장소는 목록에는 표시되지만 지도 핀에서는 제외됩니다.
        </small>
      </div>

      <div class="map-data-actions">
        <button
          type="button"
          class="secondary-btn"
          :disabled="!mapHasMoreOnServer || mapMoreLoading || mapAllLoading"
          @click="loadMoreMapLocations"
        >
          {{
            mapMoreLoading
              ? '다음 핀 불러오는 중...'
              : mapHasMoreOnServer
                ? '핀 더 불러오기'
                : '모두 불러옴'
          }}
        </button>

        <button
          type="button"
          class="primary-btn"
          :disabled="!mapHasMoreOnServer || mapMoreLoading || mapAllLoading"
          @click="loadAllMapLocations"
        >
          {{
            mapAllLoading
              ? '전체 핀 불러오는 중...'
              : '선택 카테고리 전체 불러오기'
          }}
        </button>
      </div>
    </section>

    <section v-if="activeTab === 'list'" class="list-view-section">
      <div v-if="listLoading" class="list-loading-state">
        <span class="loading-spinner large" />
        <strong>서울의 장소 목록을 불러오고 있어요.</strong>
      </div>

      <div v-else-if="listError" class="inline-alert error-alert">
        <span>⚠️</span>
        <p>{{ listError }}</p>
        <button type="button" @click="loadSelectedListData">
          다시 시도
        </button>
      </div>

      <div v-else-if="!activeListLocations.length" class="list-empty-state">
        <span>🧭</span>
        <h2>조건에 맞는 장소가 없습니다.</h2>
        <p>다른 카테고리를 선택하거나 검색어를 바꿔보세요.</p>
      </div>

      <template v-else>
        <div class="list-view-header">
          <div>
            <span class="card-kicker">Place List</span>
            <h2>서울 지역정보 목록</h2>
            <p>
              사진과 주소를 확인하고, 전화번호가 있는 장소는 바로 연락할 수 있어요.
            </p>
          </div>
          <strong>{{ listAvailableTotal.toLocaleString('ko-KR') }}곳</strong>
        </div>

        <div class="place-card-grid">
          <article
            v-for="location in displayedListLocations"
            :key="location.content_id"
            class="place-list-card"
          >
            <div class="place-list-image">
              <img
                v-if="getListImage(location) && !isListImageFailed(location)"
                :src="getListImage(location)"
                :alt="`${location.title} 대표 이미지`"
                loading="lazy"
                @error="handleListImageError(location)"
              />
              <div v-else class="place-list-image-placeholder">
                <span>{{ categoryConfig(location.category).emoji }}</span>
                <small>등록된 이미지가 없습니다.</small>
              </div>
              <span
                class="place-list-category"
                :style="{
                  color: categoryConfig(location.category).color,
                }"
              >
                {{ categoryConfig(location.category).label }}
              </span>
            </div>

            <div class="place-list-body">
              <h3>{{ location.title }}</h3>

              <div class="place-list-info">
                <div>
                  <span>📍</span>
                  <p>{{ getLocationAddress(location) || '주소 정보가 없습니다.' }}</p>
                </div>
                <div v-if="location.tel">
                  <span>☎️</span>
                  <a :href="`tel:${location.tel}`">{{ location.tel }}</a>
                </div>
              </div>

              <div class="place-list-actions">
                <a
                  v-if="location.tel"
                  class="list-action-btn phone"
                  :href="`tel:${location.tel}`"
                >
                  전화하기
                </a>
                <button
                  class="list-action-btn"
                  type="button"
                  :disabled="!hasValidCoordinates(location)"
                  @click="openLocationOnMap(location)"
                >
                  지도에서 보기
                </button>
                <button
                  class="list-action-btn route"
                  type="button"
                  :disabled="!hasValidCoordinates(location)"
                  @click="setRoutePointFromList('start', location)"
                >
                  출발지로
                </button>
              </div>
            </div>
          </article>
        </div>

        <div v-if="hasMoreListLocations" class="list-more-wrap">
          <button
            type="button"
            class="list-more-btn"
            :disabled="listMoreLoading"
            @click="loadMoreListLocations"
          >
            <span
              v-if="listMoreLoading"
              class="button-spinner list-button-spinner"
            />
            {{ listMoreLoading ? '다음 장소 불러오는 중...' : '더 보기' }}
            <span>
              화면 {{ displayedListLocations.length.toLocaleString('ko-KR') }} ·
              불러옴 {{ activeListLocations.length.toLocaleString('ko-KR') }} /
              전체 {{ listAvailableTotal.toLocaleString('ko-KR') }}
            </span>
          </button>
        </div>
      </template>
    </section>

    <div
      v-if="activeTab === 'map' && dataError"
      class="inline-alert error-alert"
    >
      <span>⚠️</span>
      <p>{{ dataError }}</p>
      <button type="button" @click="loadSelectedCategoryData({ fit: false })">
        다시 시도
      </button>
    </div>

    <section v-show="activeTab === 'map'" class="map-layout">
      <div class="map-card">
        <div ref="mapElement" class="leaflet-map" />

        <div v-if="mapLoading" class="map-overlay">
          <span class="loading-spinner large" />
          <strong>서울의 장소를 지도에 표시하고 있어요.</strong>
        </div>

        <div v-if="mapError" class="map-overlay map-error-overlay">
          <span>🗺️</span>
          <strong>지도를 불러오지 못했습니다.</strong>
          <p>{{ mapError }}</p>
        </div>

        <div class="map-legend">
          <strong>핀 범례</strong>
          <div class="legend-items">
            <span
              v-for="category in CATEGORY_CONFIG"
              :key="category.id"
              :class="{
                muted: !selectedCategories.includes(category.id),
              }"
            >
              <i :style="{ backgroundColor: category.color }" />
              {{ category.label }}
            </span>
          </div>
        </div>
      </div>

      <aside class="map-sidebar">
        <section class="sidebar-card route-card">
          <div class="sidebar-card-header">
            <div>
              <span class="card-kicker">Route Planner</span>
              <h2>두 장소 경로 안내</h2>
            </div>
            <button
              v-if="routeStart || routeEnd"
              class="icon-text-btn"
              type="button"
              @click="clearRoute"
            >
              초기화
            </button>
          </div>

          <div class="route-points">
            <div class="route-point start-point">
              <span class="point-symbol">A</span>
              <div>
                <small>출발지</small>
                <strong>{{ routeStart?.title || '장소를 선택해주세요' }}</strong>
              </div>
            </div>

            <button
              class="swap-btn"
              type="button"
              :disabled="!routeStart && !routeEnd"
              aria-label="출발지와 도착지 바꾸기"
              @click="swapRoutePoints"
            >
              ⇅
            </button>

            <div class="route-point end-point">
              <span class="point-symbol">B</span>
              <div>
                <small>도착지</small>
                <strong>{{ routeEnd?.title || '장소를 선택해주세요' }}</strong>
              </div>
            </div>
          </div>

          <button
            class="route-search-btn"
            type="button"
            :disabled="!routeReady"
            @click="findRoute"
          >
            <span v-if="routeLoading" class="button-spinner" />
            {{ routeLoading ? '경로를 찾는 중...' : '대중교통 경로 찾기' }}
          </button>

          <p v-if="!ODSAY_API_KEY" class="route-key-notice">
            `.env.local`에 `VITE_ODSAY_API_KEY`를 등록하면 실제 대중교통
            경로와 노선이 표시됩니다.
          </p>

          <div v-if="routeError" class="route-message">
            {{ routeError }}
          </div>

          <div v-if="routeInfo" class="route-result">
            <div class="route-summary-grid">
              <div v-if="routeInfo.mode === 'odsay'">
                <span>예상 시간</span>
                <strong>{{ formatMinutes(routeInfo.totalTime) }}</strong>
              </div>
              <div>
                <span>{{ routeInfo.mode === 'odsay' ? '이동 거리' : '직선 거리' }}</span>
                <strong>{{ formatDistance(routeInfo.totalDistance) }}</strong>
              </div>
              <div v-if="routeInfo.mode === 'odsay'">
                <span>예상 요금</span>
                <strong>{{ formatFare(routeInfo.payment) }}</strong>
              </div>
              <div v-if="routeInfo.mode === 'odsay'">
                <span>환승</span>
                <strong>{{ routeInfo.transferCount }}회</strong>
              </div>
            </div>

            <ol v-if="routeInfo.steps?.length" class="route-steps">
              <li v-for="step in routeInfo.steps" :key="step.id">
                <span class="step-icon">{{ step.icon }}</span>
                <div>
                  <strong>{{ step.title }}</strong>
                  <p>{{ step.description }}</p>
                  <small>
                    {{ formatMinutes(step.minutes) }} ·
                    {{ formatDistance(step.distance) }}
                  </small>
                </div>
              </li>
            </ol>

            <p v-if="routeInfo.mode === 'odsay'" class="odsay-credit">
              대중교통 경로 제공 · powered by www.ODsay.com
            </p>
          </div>
        </section>

        <section v-if="selectedPlace" class="sidebar-card place-detail-card">
          <div class="place-image-wrap">
            <img
              v-if="selectedImage"
              :src="selectedImage"
              :alt="`${selectedPlace.title} 대표 이미지`"
              loading="lazy"
              @error="selectedImageFailed = true"
            />
            <div v-else class="place-image-placeholder">
              <span>{{ categoryConfig(selectedPlace.category).emoji }}</span>
              <small>등록된 이미지가 없습니다.</small>
            </div>
            <span
              class="place-category-badge"
              :style="{
                color: categoryConfig(selectedPlace.category).color,
              }"
            >
              {{ categoryConfig(selectedPlace.category).label }}
            </span>
          </div>

          <div class="place-detail-body">
            <div v-if="detailLoading" class="detail-loading">
              <span class="loading-spinner" /> 상세 정보를 불러오는 중...
            </div>

            <template v-else>
              <h2>{{ selectedPlace.title }}</h2>

              <div class="place-info-list">
                <div>
                  <span>📍</span>
                  <p>{{ selectedAddress || '주소 정보가 없습니다.' }}</p>
                </div>
                <div v-if="selectedPlace.tel">
                  <span>☎️</span>
                  <a :href="`tel:${selectedPlace.tel}`">
                    {{ selectedPlace.tel }}
                  </a>
                </div>
                <div v-if="selectedPlace.zipcode">
                  <span>✉️</span>
                  <p>우편번호 {{ selectedPlace.zipcode }}</p>
                </div>
              </div>

              <div
                v-if="selectedClassifications.length"
                class="classification-list"
              >
                <span
                  v-for="classification in selectedClassifications"
                  :key="classification"
                >
                  {{ classification }}
                </span>
              </div>

              <p v-if="detailError" class="detail-error">{{ detailError }}</p>

              <div class="place-action-grid">
                <button
                  class="route-point-btn start"
                  type="button"
                  @click="setRoutePoint('start')"
                >
                  A 출발지로
                </button>
                <button
                  class="route-point-btn end"
                  type="button"
                  @click="setRoutePoint('end')"
                >
                  B 도착지로
                </button>
                <a
                  v-if="selectedPlace.tel"
                  class="sub-action-btn"
                  :href="`tel:${selectedPlace.tel}`"
                >
                  전화하기
                </a>
                <button
                  class="sub-action-btn"
                  type="button"
                  :disabled="!selectedAddress"
                  @click="copyAddress"
                >
                  주소 복사
                </button>
                <button
                  class="sub-action-btn wide"
                  type="button"
                  @click="openKakaoMap(selectedPlace)"
                >
                  카카오맵에서 위치 열기
                </button>
              </div>
            </template>
          </div>
        </section>

        <section v-else class="sidebar-card empty-detail-card">
          <div class="empty-detail-icon">📌</div>
          <h2>궁금한 핀을 선택해보세요.</h2>
          <p>
            대표 이미지, 주소, 전화번호와 상세 분류를 확인하고 출발지나
            도착지로 지정할 수 있어요.
          </p>
        </section>

        <section class="sidebar-card visible-list-card">
          <div class="sidebar-card-header compact">
            <div>
              <span class="card-kicker">Visible Places</span>
              <h2>지도에 표시된 장소</h2>
            </div>
            <strong class="result-count">{{ visibleLocations.length }}</strong>
          </div>

          <div v-if="previewLocations.length" class="visible-place-list">
            <button
              v-for="location in previewLocations"
              :key="location.content_id"
              type="button"
              @click="focusLocation(location)"
            >
              <span
                class="list-place-icon"
                :style="{
                  backgroundColor: `${categoryConfig(location.category).color}18`,
                  color: categoryConfig(location.category).color,
                }"
              >
                {{ categoryConfig(location.category).emoji }}
              </span>
              <span class="list-place-copy">
                <strong>{{ location.title }}</strong>
                <small>{{ location.addr1 || '주소 정보 없음' }}</small>
              </span>
            </button>
          </div>

          <p v-else class="visible-list-empty">
            선택한 조건에 맞는 좌표 데이터가 없습니다.
          </p>
        </section>
      </aside>
    </section>
  </div>
</template>

<style scoped>
.map-page {
  width: 100%;
  max-width: 1200px;
  margin: 0 auto;
  padding: 24px 0 48px;
  box-sizing: border-box;
  color: #0f172a;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
}

button,
input {
  font: inherit;
}

button {
  -webkit-tap-highlight-color: transparent;
}

.breadcrumb {
  color: #94a3b8;
  font-size: 13px;
  margin-bottom: 16px;
  display: flex;
  align-items: center;
  gap: 6px;
}

.home-icon {
  font-size: 14px;
}

.breadcrumb .arrow {
  color: #cbd5e1;
  font-weight: 700;
}

.breadcrumb .current {
  color: #64748b;
  font-weight: 600;
}

.page-header {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 24px;
  margin-bottom: 22px;
}

.page-eyebrow,
.card-kicker {
  display: inline-block;
  margin-bottom: 6px;
  color: #2563eb;
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.page-title {
  margin: 0 0 8px;
  font-size: clamp(24px, 4vw, 34px);
  line-height: 1.2;
  letter-spacing: -1px;
}

.page-desc {
  margin: 0;
  color: #64748b;
  font-size: 14px;
  line-height: 1.65;
}

.header-stat {
  min-width: 132px;
  padding: 14px 18px;
  border: 1px solid #dbeafe;
  border-radius: 14px;
  background: #eff6ff;
  text-align: right;
}

.header-stat strong {
  display: block;
  color: #1d4ed8;
  font-size: 24px;
}

.header-stat span {
  color: #64748b;
  font-size: 12px;
  font-weight: 600;
}

.weather-card {
  min-height: 136px;
  margin-bottom: 18px;
  padding: 22px 24px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 24px;
  border: 1px solid #bfdbfe;
  border-radius: 18px;
  background:
    radial-gradient(circle at 8% 20%, rgba(255, 255, 255, 0.88), transparent 28%),
    linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%);
  box-sizing: border-box;
  overflow: hidden;
}

.weather-card.excellent {
  border-color: #a7f3d0;
  background: linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%);
}

.weather-card.good {
  border-color: #bae6fd;
  background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%);
}

.weather-card.normal {
  border-color: #fde68a;
  background: linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%);
}

.weather-card.caution,
.weather-card.bad {
  border-color: #fecaca;
  background: linear-gradient(135deg, #fff7ed 0%, #fee2e2 100%);
}

.weather-main {
  display: flex;
  align-items: center;
  gap: 16px;
  min-width: 0;
}

.weather-icon {
  width: 72px;
  height: 72px;
  display: grid;
  place-items: center;
  flex: 0 0 auto;
  border: 1px solid rgba(255, 255, 255, 0.9);
  border-radius: 20px;
  background: rgba(255, 255, 255, 0.7);
  box-shadow: 0 12px 30px rgba(30, 64, 175, 0.08);
  font-size: 36px;
}

.weather-label {
  color: #64748b;
  font-size: 12px;
  font-weight: 700;
}

.weather-temperature-row {
  display: flex;
  align-items: baseline;
  gap: 10px;
}

.weather-temperature-row strong {
  font-size: 34px;
  letter-spacing: -1px;
}

.weather-temperature-row span {
  color: #334155;
  font-size: 15px;
  font-weight: 700;
}

.weather-main p {
  max-width: 470px;
  margin: 4px 0 0;
  color: #475569;
  font-size: 13px;
  line-height: 1.5;
}

.weather-metrics {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 20px;
  flex: 0 0 auto;
}

.weather-score {
  display: flex;
  align-items: center;
  gap: 10px;
}

.score-circle {
  width: 58px;
  height: 58px;
  display: grid;
  place-content: center;
  border: 5px solid rgba(37, 99, 235, 0.16);
  border-top-color: #2563eb;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.78);
  text-align: center;
}

.score-circle strong {
  font-size: 18px;
  line-height: 1;
}

.score-circle span {
  margin-top: 2px;
  color: #64748b;
  font-size: 9px;
}

.weather-score > div:last-child span,
.metric-item span {
  display: block;
  margin-bottom: 4px;
  color: #64748b;
  font-size: 10px;
  font-weight: 700;
}

.weather-score > div:last-child strong,
.metric-item strong {
  color: #1e293b;
  font-size: 13px;
  white-space: nowrap;
}

.metric-divider {
  width: 1px;
  height: 46px;
  background: rgba(100, 116, 139, 0.18);
}

.weather-loading,
.weather-error {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  color: #475569;
  font-size: 14px;
}

.weather-error > span {
  font-size: 30px;
}

.weather-error strong,
.weather-error p {
  display: block;
  margin: 0;
}

.weather-error p {
  margin-top: 3px;
  color: #64748b;
  font-size: 12px;
}

.weather-error button {
  margin-left: auto;
  padding: 8px 12px;
  border: 1px solid #bfdbfe;
  border-radius: 8px;
  background: #fff;
  color: #2563eb;
  font-weight: 700;
  cursor: pointer;
}

.map-toolbar-card {
  margin-bottom: 16px;
  padding: 16px;
  border: 1px solid #e2e8f0;
  border-radius: 16px;
  background: #fff;
  box-shadow: 0 5px 18px rgba(15, 23, 42, 0.04);
}

.search-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.search-input-wrapper {
  position: relative;
  display: flex;
  align-items: center;
  flex: 1;
  min-width: 240px;
}

.search-icon {
  position: absolute;
  left: 13px;
  font-size: 14px;
  pointer-events: none;
}

.search-input-wrapper input {
  width: 100%;
  height: 42px;
  padding: 0 40px 0 38px;
  border: 1px solid #cbd5e1;
  border-radius: 10px;
  outline: none;
  color: #0f172a;
  background: #fff;
  font-size: 14px;
  box-sizing: border-box;
  transition: border-color 0.18s ease, box-shadow 0.18s ease;
}

.search-input-wrapper input:focus {
  border-color: #2563eb;
  box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1);
}

.input-clear {
  position: absolute;
  right: 10px;
  width: 26px;
  height: 26px;
  border: 0;
  border-radius: 50%;
  background: #f1f5f9;
  color: #64748b;
  cursor: pointer;
}

.primary-btn,
.secondary-btn {
  height: 42px;
  padding: 0 16px;
  border-radius: 10px;
  font-size: 13px;
  font-weight: 700;
  white-space: nowrap;
  cursor: pointer;
  transition: transform 0.18s ease, box-shadow 0.18s ease;
}

.primary-btn {
  border: 1px solid #2563eb;
  background: #2563eb;
  color: #fff;
  box-shadow: 0 5px 12px rgba(37, 99, 235, 0.18);
}

.secondary-btn {
  border: 1px solid #cbd5e1;
  background: #fff;
  color: #334155;
}

.primary-btn:hover,
.secondary-btn:hover {
  transform: translateY(-1px);
}

.filter-row {
  margin-top: 14px;
  padding-top: 14px;
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  border-top: 1px solid #f1f5f9;
}

.category-filters {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.category-chip {
  min-height: 34px;
  padding: 0 11px;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  border: 1px solid #e2e8f0;
  border-radius: 999px;
  background: #f8fafc;
  color: #94a3b8;
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.16s ease;
}

.category-chip.active {
  border-color: #cbd5e1;
  background: #fff;
  color: #334155;
  box-shadow: 0 3px 10px rgba(15, 23, 42, 0.06);
}

.category-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
}

.chip-loading {
  width: 11px;
  height: 11px;
  border: 2px solid #e2e8f0;
  border-top-color: #2563eb;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

.filter-actions {
  display: flex;
  align-items: center;
  gap: 12px;
  flex: 0 0 auto;
}

.image-filter {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  color: #475569;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
}

.image-filter input {
  accent-color: #2563eb;
}

.text-btn,
.icon-text-btn {
  border: 0;
  background: transparent;
  color: #2563eb;
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;
}

.search-summary {
  margin-top: 12px;
  padding: 10px 12px;
  border-radius: 9px;
  background: #eff6ff;
  color: #475569;
  font-size: 12px;
}

.search-summary strong {
  color: #1d4ed8;
}

.inline-alert {
  margin-bottom: 14px;
  padding: 12px 14px;
  display: flex;
  align-items: center;
  gap: 10px;
  border-radius: 10px;
  font-size: 13px;
}

.inline-alert p {
  flex: 1;
  margin: 0;
}

.error-alert {
  border: 1px solid #fecaca;
  background: #fff1f2;
  color: #b91c1c;
}

.error-alert button {
  border: 0;
  background: transparent;
  color: #b91c1c;
  font-weight: 700;
  cursor: pointer;
}


.view-tabs {
  margin-bottom: 16px;
  padding: 5px;
  display: inline-flex;
  align-items: center;
  gap: 4px;
  border: 1px solid #dbe3ee;
  border-radius: 13px;
  background: #f1f5f9;
}

.view-tab {
  min-height: 42px;
  padding: 0 16px;
  display: inline-flex;
  align-items: center;
  gap: 7px;
  border: 0;
  border-radius: 9px;
  background: transparent;
  color: #64748b;
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.18s ease;
}

.view-tab strong {
  min-width: 24px;
  padding: 2px 7px;
  border-radius: 999px;
  background: #e2e8f0;
  color: #64748b;
  font-size: 10px;
  text-align: center;
}

.view-tab.active {
  background: #ffffff;
  color: #1d4ed8;
  box-shadow: 0 3px 10px rgba(15, 23, 42, 0.09);
}

.view-tab.active strong {
  background: #dbeafe;
  color: #1d4ed8;
}

.tab-icon {
  font-size: 15px;
}

.map-data-status {
  margin-bottom: 16px;
  padding: 14px 16px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  border: 1px solid #dbeafe;
  border-radius: 14px;
  background: #eff6ff;
}

.map-data-copy {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.map-data-copy strong {
  color: #1e3a8a;
  font-size: 13px;
}

.map-data-copy span {
  color: #334155;
  font-size: 12px;
  font-weight: 700;
  line-height: 1.5;
}

.map-data-copy small {
  color: #64748b;
  font-size: 10px;
  line-height: 1.5;
}

.map-data-actions {
  display: flex;
  flex: 0 0 auto;
  gap: 8px;
}

.map-data-actions button:disabled,
.list-more-btn:disabled {
  opacity: 0.55;
  cursor: not-allowed;
  transform: none;
}

.list-button-spinner {
  border-color: #bfdbfe;
  border-top-color: #2563eb;
}

.list-view-section {
  min-height: 320px;
}

.list-loading-state,
.list-empty-state {
  min-height: 320px;
  padding: 40px 24px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 10px;
  border: 1px solid #e2e8f0;
  border-radius: 18px;
  background: #ffffff;
  color: #64748b;
  text-align: center;
  box-sizing: border-box;
}

.list-empty-state > span {
  font-size: 42px;
}

.list-empty-state h2,
.list-empty-state p {
  margin: 0;
}

.list-empty-state h2 {
  color: #1e293b;
  font-size: 18px;
}

.list-empty-state p {
  font-size: 13px;
}

.list-view-header {
  margin-bottom: 14px;
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 20px;
}

.list-view-header h2 {
  margin: 0;
  font-size: 19px;
  letter-spacing: -0.4px;
}

.list-view-header p {
  margin: 5px 0 0;
  color: #64748b;
  font-size: 13px;
}

.list-view-header > strong {
  min-width: 62px;
  padding: 8px 12px;
  border-radius: 999px;
  background: #eff6ff;
  color: #1d4ed8;
  font-size: 13px;
  text-align: center;
}

.place-card-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 16px;
}

.place-list-card {
  min-width: 0;
  display: flex;
  flex-direction: column;
  border: 1px solid #e2e8f0;
  border-radius: 16px;
  background: #ffffff;
  box-shadow: 0 4px 15px rgba(15, 23, 42, 0.045);
  overflow: hidden;
  transition: transform 0.18s ease, box-shadow 0.18s ease, border-color 0.18s ease;
}

.place-list-card:hover {
  transform: translateY(-3px);
  border-color: #bfdbfe;
  box-shadow: 0 13px 28px rgba(15, 23, 42, 0.1);
}

.place-list-image {
  position: relative;
  aspect-ratio: 16 / 9;
  overflow: hidden;
  background: #f1f5f9;
}

.place-list-image img {
  width: 100%;
  height: 100%;
  display: block;
  object-fit: cover;
  transition: transform 0.3s ease;
}

.place-list-card:hover .place-list-image img {
  transform: scale(1.035);
}

.place-list-image-placeholder {
  width: 100%;
  height: 100%;
  display: grid;
  place-content: center;
  gap: 7px;
  background:
    radial-gradient(circle at 20% 20%, rgba(219, 234, 254, 0.9), transparent 35%),
    linear-gradient(135deg, #f8fafc, #e2e8f0);
  color: #94a3b8;
  text-align: center;
}

.place-list-image-placeholder span {
  font-size: 38px;
}

.place-list-image-placeholder small {
  font-size: 11px;
}

.place-list-category {
  position: absolute;
  top: 11px;
  left: 11px;
  padding: 5px 9px;
  border: 1px solid rgba(255, 255, 255, 0.92);
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.92);
  box-shadow: 0 4px 10px rgba(15, 23, 42, 0.12);
  font-size: 11px;
  font-weight: 800;
  backdrop-filter: blur(6px);
}

.place-list-body {
  padding: 15px;
  display: flex;
  flex: 1;
  flex-direction: column;
}

.place-list-body h3 {
  margin: 0 0 11px;
  color: #1e293b;
  font-size: 16px;
  line-height: 1.4;
  letter-spacing: -0.3px;
}

.place-list-info {
  display: grid;
  gap: 8px;
  margin-bottom: 15px;
}

.place-list-info > div {
  display: flex;
  align-items: flex-start;
  gap: 7px;
  color: #64748b;
  font-size: 12px;
  line-height: 1.5;
}

.place-list-info span {
  flex: 0 0 auto;
}

.place-list-info p,
.place-list-info a {
  min-width: 0;
  margin: 0;
  color: inherit;
  overflow-wrap: anywhere;
  text-decoration: none;
}

.place-list-info a:hover {
  color: #2563eb;
  text-decoration: underline;
}

.place-list-actions {
  margin-top: auto;
  padding-top: 12px;
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 7px;
  border-top: 1px solid #f1f5f9;
}

.list-action-btn {
  min-height: 36px;
  padding: 0 10px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: 1px solid #cbd5e1;
  border-radius: 8px;
  background: #ffffff;
  color: #334155;
  font-size: 11px;
  font-weight: 700;
  text-decoration: none;
  cursor: pointer;
}

.list-action-btn:hover:not(:disabled) {
  border-color: #93c5fd;
  background: #eff6ff;
  color: #1d4ed8;
}

.list-action-btn.phone {
  border-color: #bbf7d0;
  background: #f0fdf4;
  color: #15803d;
}

.list-action-btn.route {
  border-color: #dbeafe;
  background: #eff6ff;
  color: #1d4ed8;
}

.list-action-btn:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

.list-more-wrap {
  margin-top: 22px;
  display: flex;
  justify-content: center;
}

.list-more-btn {
  min-width: 190px;
  min-height: 44px;
  padding: 0 18px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 9px;
  border: 1px solid #bfdbfe;
  border-radius: 11px;
  background: #ffffff;
  color: #1d4ed8;
  font-size: 13px;
  font-weight: 800;
  cursor: pointer;
  box-shadow: 0 4px 12px rgba(37, 99, 235, 0.08);
}

.list-more-btn span {
  color: #94a3b8;
  font-size: 10px;
}

.map-layout {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 360px;
  gap: 18px;
  align-items: start;
}

.map-card {
  position: sticky;
  top: 18px;
  min-width: 0;
  height: min(720px, calc(100vh - 48px));
  min-height: 580px;
  border: 1px solid #dbe3ee;
  border-radius: 18px;
  background: #e2e8f0;
  box-shadow: 0 14px 34px rgba(15, 23, 42, 0.1);
  overflow: hidden;
}

.leaflet-map {
  width: 100%;
  height: 100%;
  z-index: 1;
}

.map-overlay {
  position: absolute;
  inset: 0;
  z-index: 500;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  background: rgba(248, 250, 252, 0.88);
  color: #334155;
  backdrop-filter: blur(4px);
}

.map-error-overlay span {
  font-size: 42px;
}

.map-error-overlay p {
  max-width: 440px;
  margin: 0;
  color: #64748b;
  text-align: center;
}

.map-legend {
  position: absolute;
  left: 14px;
  bottom: 22px;
  z-index: 450;
  max-width: calc(100% - 28px);
  padding: 10px 12px;
  border: 1px solid rgba(226, 232, 240, 0.9);
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.93);
  box-shadow: 0 6px 20px rgba(15, 23, 42, 0.12);
  backdrop-filter: blur(8px);
}

.map-legend > strong {
  display: block;
  margin-bottom: 7px;
  color: #334155;
  font-size: 10px;
}

.legend-items {
  display: flex;
  flex-wrap: wrap;
  gap: 5px 10px;
}

.legend-items span {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  color: #475569;
  font-size: 10px;
  transition: opacity 0.15s ease;
}

.legend-items span.muted {
  opacity: 0.28;
}

.legend-items i {
  width: 7px;
  height: 7px;
  border-radius: 50%;
}

.map-sidebar {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.sidebar-card {
  border: 1px solid #e2e8f0;
  border-radius: 16px;
  background: #fff;
  box-shadow: 0 6px 20px rgba(15, 23, 42, 0.05);
  overflow: hidden;
}

.route-card,
.empty-detail-card,
.visible-list-card {
  padding: 18px;
}

.sidebar-card-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 14px;
}

.sidebar-card-header.compact {
  align-items: center;
}

.sidebar-card-header h2,
.empty-detail-card h2,
.place-detail-body h2 {
  margin: 0;
  color: #0f172a;
  font-size: 17px;
  letter-spacing: -0.35px;
}

.route-points {
  position: relative;
  display: grid;
  gap: 8px;
}

.route-point {
  min-height: 58px;
  padding: 10px 42px 10px 10px;
  display: flex;
  align-items: center;
  gap: 10px;
  border: 1px solid #e2e8f0;
  border-radius: 11px;
  background: #f8fafc;
  box-sizing: border-box;
}

.point-symbol {
  width: 28px;
  height: 28px;
  display: grid;
  place-items: center;
  flex: 0 0 auto;
  border-radius: 50%;
  background: #2563eb;
  color: #fff;
  font-size: 11px;
  font-weight: 800;
}

.end-point .point-symbol {
  background: #ef4444;
}

.route-point small,
.route-point strong {
  display: block;
}

.route-point small {
  margin-bottom: 3px;
  color: #94a3b8;
  font-size: 10px;
}

.route-point strong {
  max-width: 230px;
  overflow: hidden;
  color: #334155;
  font-size: 12px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.swap-btn {
  position: absolute;
  top: 44px;
  right: 12px;
  z-index: 2;
  width: 32px;
  height: 32px;
  border: 1px solid #cbd5e1;
  border-radius: 50%;
  background: #fff;
  color: #475569;
  cursor: pointer;
}

.swap-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.route-search-btn {
  width: 100%;
  min-height: 42px;
  margin-top: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  border: 0;
  border-radius: 10px;
  background: #0f172a;
  color: #fff;
  font-size: 13px;
  font-weight: 800;
  cursor: pointer;
}

.route-search-btn:disabled {
  background: #cbd5e1;
  cursor: not-allowed;
}

.route-key-notice,
.route-message {
  margin: 10px 0 0;
  padding: 9px 10px;
  border-radius: 8px;
  font-size: 11px;
  line-height: 1.5;
}

.route-key-notice {
  background: #fffbeb;
  color: #92400e;
}

.route-message {
  background: #f1f5f9;
  color: #475569;
}

.route-result {
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px solid #f1f5f9;
}

.route-summary-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 8px;
}

.route-summary-grid > div {
  padding: 10px;
  border-radius: 9px;
  background: #f8fafc;
}

.route-summary-grid span,
.route-summary-grid strong {
  display: block;
}

.route-summary-grid span {
  margin-bottom: 3px;
  color: #94a3b8;
  font-size: 9px;
  font-weight: 700;
}

.route-summary-grid strong {
  color: #1e293b;
  font-size: 13px;
}

.route-steps {
  margin: 12px 0 0;
  padding: 0;
  display: grid;
  gap: 10px;
  list-style: none;
}

.route-steps li {
  display: flex;
  gap: 9px;
}

.step-icon {
  width: 30px;
  height: 30px;
  display: grid;
  place-items: center;
  flex: 0 0 auto;
  border-radius: 8px;
  background: #eff6ff;
}

.route-steps strong,
.route-steps p,
.route-steps small {
  display: block;
}

.route-steps strong {
  color: #334155;
  font-size: 12px;
}

.route-steps p {
  margin: 2px 0;
  color: #64748b;
  font-size: 10px;
  line-height: 1.4;
}

.route-steps small {
  color: #94a3b8;
  font-size: 9px;
}

.odsay-credit {
  margin: 12px 0 0;
  color: #94a3b8;
  font-size: 9px;
  text-align: right;
}

.place-image-wrap {
  position: relative;
  aspect-ratio: 16 / 9;
  background: #e2e8f0;
  overflow: hidden;
}

.place-image-wrap img {
  width: 100%;
  height: 100%;
  display: block;
  object-fit: cover;
}

.place-image-placeholder {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  background: linear-gradient(135deg, #f8fafc, #e2e8f0);
  color: #94a3b8;
}

.place-image-placeholder span {
  font-size: 38px;
}

.place-image-placeholder small {
  font-size: 11px;
}

.place-category-badge {
  position: absolute;
  left: 12px;
  bottom: 12px;
  padding: 5px 9px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.92);
  box-shadow: 0 5px 14px rgba(15, 23, 42, 0.16);
  font-size: 10px;
  font-weight: 800;
}

.place-detail-body {
  padding: 16px;
}

.detail-loading {
  display: flex;
  align-items: center;
  gap: 9px;
  color: #64748b;
  font-size: 12px;
}

.place-info-list {
  margin-top: 13px;
  display: grid;
  gap: 9px;
}

.place-info-list > div {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  color: #475569;
  font-size: 12px;
  line-height: 1.5;
}

.place-info-list p {
  margin: 0;
}

.place-info-list a {
  color: #2563eb;
  font-weight: 700;
  text-decoration: none;
}

.classification-list {
  margin-top: 12px;
  display: flex;
  flex-wrap: wrap;
  gap: 5px;
}

.classification-list span {
  padding: 4px 7px;
  border-radius: 6px;
  background: #f1f5f9;
  color: #64748b;
  font-size: 9px;
  font-weight: 700;
}

.detail-error {
  margin: 10px 0 0;
  color: #dc2626;
  font-size: 11px;
}

.place-action-grid {
  margin-top: 14px;
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 7px;
}

.route-point-btn,
.sub-action-btn {
  min-height: 38px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 9px;
  font-size: 11px;
  font-weight: 800;
  text-align: center;
  text-decoration: none;
  cursor: pointer;
  box-sizing: border-box;
}

.route-point-btn {
  border: 0;
  color: #fff;
}

.route-point-btn.start {
  background: #2563eb;
}

.route-point-btn.end {
  background: #ef4444;
}

.sub-action-btn {
  border: 1px solid #cbd5e1;
  background: #fff;
  color: #475569;
}

.sub-action-btn:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

.sub-action-btn.wide {
  grid-column: 1 / -1;
}

.empty-detail-card {
  text-align: center;
}

.empty-detail-icon {
  margin-bottom: 10px;
  font-size: 34px;
}

.empty-detail-card p {
  margin: 8px 0 0;
  color: #64748b;
  font-size: 12px;
  line-height: 1.6;
}

.result-count {
  min-width: 30px;
  height: 30px;
  display: grid;
  place-items: center;
  border-radius: 50%;
  background: #eff6ff;
  color: #2563eb;
  font-size: 11px;
}

.visible-place-list {
  display: grid;
  gap: 3px;
}

.visible-place-list button {
  width: 100%;
  padding: 8px 4px;
  display: flex;
  align-items: center;
  gap: 9px;
  border: 0;
  border-bottom: 1px solid #f1f5f9;
  background: transparent;
  text-align: left;
  cursor: pointer;
}

.visible-place-list button:last-child {
  border-bottom: 0;
}

.visible-place-list button:hover {
  background: #f8fafc;
}

.list-place-icon {
  width: 34px;
  height: 34px;
  display: grid;
  place-items: center;
  flex: 0 0 auto;
  border-radius: 10px;
}

.list-place-copy {
  min-width: 0;
}

.list-place-copy strong,
.list-place-copy small {
  display: block;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.list-place-copy strong {
  color: #334155;
  font-size: 11px;
}

.list-place-copy small {
  margin-top: 3px;
  color: #94a3b8;
  font-size: 9px;
}

.visible-list-empty {
  margin: 0;
  padding: 16px 0;
  color: #94a3b8;
  font-size: 11px;
  text-align: center;
}

.loading-spinner,
.button-spinner {
  display: inline-block;
  border: 2px solid #dbeafe;
  border-top-color: #2563eb;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

.loading-spinner {
  width: 18px;
  height: 18px;
}

.loading-spinner.large {
  width: 30px;
  height: 30px;
  border-width: 3px;
}

.button-spinner {
  width: 13px;
  height: 13px;
  border-color: rgba(255, 255, 255, 0.35);
  border-top-color: #fff;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

:global(.localhub-marker-wrapper) {
  border: 0;
  background: transparent;
}

:global(.localhub-map-pin) {
  position: relative;
  width: 38px;
  height: 38px;
  display: grid;
  place-items: center;
  border: 3px solid #fff;
  border-radius: 50% 50% 50% 12px;
  background: var(--pin-color);
  box-shadow: 0 8px 18px rgba(15, 23, 42, 0.28);
  color: #fff;
  font-size: 17px;
  transform: rotate(-45deg);
  transition: transform 0.16s ease, filter 0.16s ease;
}

:global(.localhub-map-pin::after) {
  content: '';
  position: absolute;
  inset: 3px;
  border: 1px solid rgba(255, 255, 255, 0.38);
  border-radius: inherit;
}

:global(.localhub-map-pin > span) {
  position: relative;
  z-index: 1;
  transform: rotate(45deg);
}

:global(.localhub-map-pin:hover) {
  filter: brightness(1.05);
  transform: rotate(-45deg) translate(2px, -2px) scale(1.08);
}

:global(.localhub-popup) {
  min-width: 190px;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
}

:global(.localhub-popup-category) {
  display: block;
  margin-bottom: 4px;
  font-size: 10px;
  font-weight: 800;
}

:global(.localhub-popup strong) {
  display: block;
  color: #0f172a;
  font-size: 13px;
}

:global(.localhub-popup p) {
  margin: 5px 0;
  color: #64748b;
  font-size: 10px;
  line-height: 1.45;
}

:global(.localhub-popup small) {
  color: #94a3b8;
  font-size: 9px;
}

:global(.leaflet-popup-content-wrapper) {
  border-radius: 12px;
  box-shadow: 0 10px 28px rgba(15, 23, 42, 0.18);
}

:global(.leaflet-control-zoom a) {
  color: #334155;
}

@media (max-width: 1000px) {
  .weather-card {
    align-items: flex-start;
    flex-direction: column;
  }

  .weather-metrics {
    width: 100%;
    justify-content: flex-start;
    flex-wrap: wrap;
  }

  .map-layout {
    grid-template-columns: minmax(0, 1fr) 320px;
  }
}

@media (max-width: 820px) {
  .map-layout {
    grid-template-columns: 1fr;
  }

  .map-card {
    position: relative;
    top: auto;
    height: 62vh;
    min-height: 480px;
  }

  .map-sidebar {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    align-items: start;
  }

  .route-card,
  .place-detail-card,
  .empty-detail-card {
    grid-column: auto;
  }

  .visible-list-card {
    grid-column: 1 / -1;
  }
}

@media (max-width: 640px) {
  .map-page {
    padding-top: 8px;
  }

  .map-data-status {
    align-items: stretch;
    flex-direction: column;
  }

  .map-data-actions {
    width: 100%;
    display: grid;
    grid-template-columns: 1fr;
  }

  .map-data-actions button {
    width: 100%;
  }

  .page-header {
    align-items: flex-start;
    flex-direction: column;
  }

  .header-stat {
    min-width: 0;
    width: 100%;
    text-align: left;
    box-sizing: border-box;
  }

  .header-stat strong,
  .header-stat span {
    display: inline;
  }

  .header-stat span {
    margin-left: 6px;
  }

  .weather-card {
    padding: 18px;
    border-radius: 14px;
  }

  .weather-main {
    align-items: flex-start;
  }

  .weather-icon {
    width: 56px;
    height: 56px;
    border-radius: 16px;
    font-size: 28px;
  }

  .weather-temperature-row strong {
    font-size: 28px;
  }

  .weather-metrics {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 8px;
  }

  .weather-score {
    grid-column: 1 / -1;
  }

  .metric-divider,
  .observed-at {
    display: none;
  }

  .search-row {
    display: grid;
    grid-template-columns: 1fr 70px;
  }

  .search-input-wrapper {
    min-width: 0;
  }

  .secondary-btn {
    width: 100%;
  }

  .filter-row {
    flex-direction: column;
  }

  .filter-actions {
    width: 100%;
    justify-content: space-between;
  }

  .category-filters {
    flex-wrap: nowrap;
    width: 100%;
    padding-bottom: 4px;
    overflow-x: auto;
    scrollbar-width: none;
  }

  .category-filters::-webkit-scrollbar {
    display: none;
  }

  .category-chip {
    flex: 0 0 auto;
  }

  .map-card {
    height: 58vh;
    min-height: 420px;
    border-radius: 14px;
  }

  .map-legend {
    display: none;
  }

  .map-sidebar {
    display: flex;
  }

  .route-card {
    order: 2;
  }

  .place-detail-card,
  .empty-detail-card {
    order: 1;
  }

  .visible-list-card {
    order: 3;
  }
}

@media (max-width: 420px) {
  .weather-metrics {
    grid-template-columns: repeat(2, 1fr);
  }

  .place-action-grid {
    grid-template-columns: 1fr;
  }

  .sub-action-btn.wide {
    grid-column: auto;
  }
}

@media (max-width: 980px) {
  .place-card-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 640px) {
  .view-tabs {
    width: 100%;
    box-sizing: border-box;
  }

  .view-tab {
    flex: 1;
    justify-content: center;
    padding: 0 9px;
  }

  .list-view-header {
    align-items: flex-start;
  }

  .list-view-header p {
    display: none;
  }

  .place-card-grid {
    grid-template-columns: 1fr;
    gap: 12px;
  }

  .place-list-card {
    display: grid;
    grid-template-columns: 116px minmax(0, 1fr);
  }

  .place-list-image {
    height: 100%;
    min-height: 180px;
    aspect-ratio: auto;
  }

  .place-list-body {
    padding: 13px;
  }

  .place-list-body h3 {
    font-size: 15px;
  }

  .place-list-actions {
    grid-template-columns: 1fr;
  }

  .list-action-btn.phone {
    display: none;
  }
}

</style>
