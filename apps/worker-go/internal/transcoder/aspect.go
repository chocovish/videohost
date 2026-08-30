package transcoder

import (
	"fmt"
	"math"
	"strconv"
	"strings"
)

func GCD(a, b int) int {
	x := int(math.Abs(float64(a)))
	y := int(math.Abs(float64(b)))
	for y != 0 {
		t := y
		y = x % y
		x = t
	}
	if x == 0 {
		return 1
	}
	return x
}

type DAR struct {
	DarNum int `json:"darNum"`
	DarDen int `json:"darDen"`
}

func ComputeTargetDAR(sourceWidth, sourceHeight int, sarString string) DAR {
	sNum := 1
	sDen := 1

	if sarString != "" {
		parts := strings.FieldsFunc(sarString, func(r rune) bool {
			return r == ':' || r == '/'
		})
		if len(parts) == 2 {
			n1, err1 := strconv.Atoi(parts[0])
			n2, err2 := strconv.Atoi(parts[1])
			if err1 == nil && err2 == nil && n1 > 0 && n2 > 0 {
				sNum = n1
				sDen = n2
			}
		}
	}

	w := sourceWidth
	if w <= 0 {
		w = 1280
	}
	h := sourceHeight
	if h <= 0 {
		h = 720
	}

	totalNum := w * sNum
	totalDen := h * sDen
	g := GCD(totalNum, totalDen)

	return DAR{
		DarNum: totalNum / g,
		DarDen: totalDen / g,
	}
}

func ComputeRenditionSAR(rendWidth, rendHeight, darNum, darDen int) string {
	sarNum := darNum * rendHeight
	sarDen := darDen * rendWidth
	g := GCD(sarNum, sarDen)
	return fmt.Sprintf("%d/%d", sarNum/g, sarDen/g)
}

