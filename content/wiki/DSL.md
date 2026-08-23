---
defines:
  - DSL(Domain-Specific Language, 도메인 특화 언어): 특정 문제 영역의 개념과 규칙을 간결하게 표현하도록 설계된 언어이다.
tags:
  - dsl
  - domain_specific_language
  - 도메인_특화_언어
---
## DSL(Domain-Specific Language, 도메인 특화 언어)

특정 문제 영역의 개념과 규칙을 간결하게 표현하도록 설계된 언어이다. 범용 프로그래밍 언어가 다양한 문제를 해결하는 데 목적이 있다면, DSL은 빌드 설정, UI 구성, 데이터 조회처럼 정해진 영역을 읽고 작성하기 쉽게 만드는 데 집중한다.

DSL은 구현 방식에 따라 크게 두 종류로 나뉜다.

- **외부 DSL**: 독립적인 문법과 파서를 가진다. SQL, 정규 표현식 등이 대표적이다.
- **내부 DSL**: 기존 프로그래밍 언어의 문법과 기능을 활용해 만든다. Gradle Kotlin DSL이나 Jetpack Compose가 대표적이다.

Kotlin은 고차 함수, 확장 함수, 중위 함수, 수신 객체 지정 람다 같은 기능을 제공해 내부 DSL을 만들기 좋다.

```kt
fun page(content: Page.() -> Unit): Page =
    Page().apply(content)

class Page {
    fun title(value: String) {
        println("title: $value")
    }
}

page {
    title("DSL 알아보기")
}
```

`page` 블록 안에서는 수신 객체인 `Page`의 함수를 직접 호출할 수 있다. 그 결과 일반 함수 호출보다 해당 도메인의 구조를 선언적으로 드러내는 코드가 된다.

DSL은 반복적인 설정을 줄이고 의도를 분명하게 표현할 수 있다는 장점이 있다. 반면 문법을 지나치게 숨기거나 독자적인 규칙을 많이 만들면 동작을 추적하기 어렵고 학습 비용이 커질 수 있다. 따라서 적용할 도메인의 경계를 명확히 하고, 기존 언어의 관례를 유지하는 것이 중요하다.
