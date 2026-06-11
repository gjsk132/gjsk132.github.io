---
summary: MVC, MVP, MVVM, MVI의 등장 배경과 각 아키텍처 패턴의 특징 및 차이점 정리
date: 2026-06-05
category: TIL
tags:
  - architecture
  - design_pattern
  - mvw
---
## MVW Architecture

MVW는 Model-View-Whatever의 약자로, Model과 View의 책임을 분리하고 이들 사이의 상호작용 방식을 정의하는 아키텍처 패턴들을 의미한다.

대표적인 MVW 패턴으로는 MVC, MVP, MVVM, MVI가 있다.

각 패턴은 모두 관심사 분리를 목표로 하지만,
책임을 분리하는 방식과 데이터 흐름에 차이가 있으며 각각 고유한 장단점을 가진다.

## MVC 이전

GUI 애플리케이션은 사용자 입력에 따라 데이터를 변경하고, 그 결과를 화면에 반영하는 과정을 반복한다.  
  
이러한 처리들이 하나의 클래스나 컴포넌트에 함께 작성되는 경우가 많았다.

상품 재고를 관리하는 간단한 예제를 살펴보자.

```kt
var stock = 10  
  
buyButton.setOnClickListener {  
	if (stock > 0) {  
		stock--  
		stockTextView.text = stock.toString()  
	} else {  
		showToast("재고가 없습니다.")  
	}  
}
```

위 코드에는 데이터(`stock`), 사용자 입력 처리(`setOnClickListener`), 그리고 비즈니스 규칙(재고 차감 및 재고 검증)이 모두 함께 존재한다.

이처럼 UI 코드와 비즈니스 로직의 결합성이 높으면, 애플리케이션 규모가 커질수록 유지보수와 테스트가 어려워진다.

이러한 문제를 해결하기 위해 데이터 관리, 화면 표현, 사용자 입력 처리의 책임을 분리하여 관리하는 다양한 아키택처가 등장하게 된다.


## MVC

MVC는 Model-View-Controller의 3가지 구성요소로 나뉩니다.

추가 예정


