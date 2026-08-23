---
summary: Jetpack Compose의 지연 목록과 지연 그리드가 필요한 이유와 DSL, 항목 키, 스크롤 상태 정리
date: 2026-08-21
category: TIL
tags:
  - LazyColumn
  - LazyGrid
  - Jetpack-Compose
  - lazy-layout
  - performance
  - android
---

## 목록 안의 무수한 아이템들

앱에서는 메시지, 상품, 영상처럼 많은 항목을 세로 목록으로 보여주는 경우가 많다.

세로 목록을 만드는 가장 단순한 방법은 `Column` 안에서 목록을 반복하는 것이다.

```kt
Column {
    products.forEach { product ->
        ProductItem(product)
    }
}
```

하지만 `Column`은 항목이 화면에 보이는지와 관계없이 모든 자식 항목을 구성하고 배치한다.
항목이 많거나 목록의 길이를 알 수 없다면 불필요한 작업이 늘어나 성능 문제가 생길 수 있다.

## Lazy Layout이란 무엇인가

`Lazy Layout`은 많은 항목을 효율적으로 표시하기 위한 Compose 컴포저블이다.

전체 항목을 한 번에 구성하는 대신 현재 표시 영역에 보이는 항목을 중심으로 구성하고 배치한다.

- `LazyColumn`: 항목을 한 열로 배치하고 세로로 스크롤하는 목록
- `LazyRow`: 항목을 한 행으로 배치하고 가로로 스크롤하는 목록
- `LazyVerticalGrid`: 항목을 여러 열로 배치하고 세로로 스크롤하는 그리드
- `LazyHorizontalGrid`: 항목을 여러 행으로 배치하고 가로로 스크롤하는 그리드

```kt
LazyColumn {
    items(products) { product ->
        ProductItem(product)
    }
}
```

지연 레이아웃은 기존 View 시스템의 `RecyclerView`와 비슷한 원칙을 따르지만 Adapter나 ViewHolder를 작성하는 대신 Compose의 DSL로 항목 구성을 선언한다.

## DSL로 항목 선언하기

지연 레이아웃은 DSL을 통해 항목 구성을 전달받는다. `LazyColumn`은 `LazyListScope`를 수신 객체로 하는 DSL을 제공한다.

이 DSL에는 목록의 항목 구성을 설명하는 함수가 있다.

- `item`: 단일 항목 추가
- `items(count)`: 주어진 개수만큼 항목 추가
- `items(list)`: 컬렉션의 각 데이터를 항목으로 추가
- `itemsIndexed(list)`: 데이터와 인덱스를 함께 제공

```kt
LazyColumn {
    item {
        Text("상품 목록")
    }

    items(products) { product ->
        ProductItem(product)
    }

    item {
        Text("마지막 상품입니다")
    }
}
```

## 항목 키

기본적으로 Lazy Layout은 내부 위치를 기준으로 항목을 추적한다.
항목이 추가되거나 순서가 바뀌면 기존 항목의 위치도 달라진다.

고유하고 안정적인 값을 `key`로 제공하면 Compose는 위치가 바뀌어도 같은 항목을 식별할 수 있다.

```kt
LazyColumn {
    items(
        items = products,
        key = { product -> product.id },
    ) { product ->
        ProductItem(product)
    }
}
```

`key`는 목록 안에서 유일해야 하며, 항목이 이동해도 바뀌지 않는 값을 사용해야 한다.

## 스크롤 상태 다루기

각 지연 레이아웃은 스크롤 상태를 다루는 State를 제공한다.

- `LazyColumn`, `LazyRow`: `LazyListState`
- `LazyVerticalGrid`, `LazyHorizontalGrid`: `LazyGridState`

`rememberLazyListState()`는 `LazyColumn`의 스크롤 상태를 저장하는 `LazyListState`를 생성한다.

이 객체를 통해 다음 정보를 확인하거나 제어할 수 있다.

- 현재 처음 보이는 항목
- 항목이 얼마나 스크롤되었는지
- 특정 항목으로 이동하기

다음은 `LazyListState`를 사용해 `LazyColumn`의 첫 번째 항목으로 이동하는 예시다.

```kt
val listState = rememberLazyListState()
val coroutineScope = rememberCoroutineScope()

LazyColumn(state = listState) {
    items(products) { product ->
        ProductItem(product)
    }
}

Button(
    onClick = {
        coroutineScope.launch {
            listState.animateScrollToItem(index = 0)
        }
    },
) {
    Text("맨 위로")
}
```

- `firstVisibleItemIndex`: 현재 화면에서 처음 보이는 항목의 인덱스 확인
- `scrollToItem()`: 지정한 항목으로 즉시 이동
- `animateScrollToItem()`: 지정한 항목으로 애니메이션과 함께 이동

두 이동 함수는 정지 함수이므로 `rememberCoroutineScope()`로 만든 코루틴 안에서 호출한다.

## 사용할 때 주의할 점

- 지연 레이아웃은 UI를 필요한 시점에 구성하지만 데이터를 자동으로 나누어 불러오지는 않는다. 데이터 로딩에는 Paging 같은 별도의 방식이 필요하다.
- 항목 UI 자체가 무거우면 화면에 처음 나타날 때 스크롤이 끊길 수 있으므로 각 항목의 구성 비용도 줄여야 한다.
- 크기가 정해지지 않은 지연 레이아웃을 같은 방향의 다른 스크롤 안에 중첩하면 측정 문제가 발생할 수 있다.
