//go:build js && wasm

package main

import (
  "bytes"
  "fmt"
  "syscall/js"
  "encoding/base64"
)

func main() {
  // 在 JS 全域掛一個函式 "generateQart"
  js.Global().Set("generateQart", js.FuncOf(genqart))
  fmt.Println("qart.wasm loaded")
  select {}
}

// generateQart(url, options, halftoneBytes) string(base64 PNG)
func genqart(this js.Value, args []js.Value) interface{} {
  console := js.Global().Get("console")
  if len(args) < 2 {
    console.Call("error", "[QART] error: missing arguments (need url, options[, halftoneBytes])")
    return "error: missing arguments"
  }

  // 解析參數
  url := args[0].String()
  opts := args[1]

  var m Image
  m.URL = url
  m.Version = opts.Get("version").Int()
  m.Mask = opts.Get("mask").Int()
  m.Scale = opts.Get("scale").Int()
  m.Rotation = opts.Get("rotation").Int()
  m.Rand = opts.Get("rand").Bool()
  m.Dither = opts.Get("dither").Bool()
  m.OnlyDataBits = opts.Get("onlyDataBits").Bool()
  m.SaveControl = opts.Get("saveControl").Bool()
  m.Brightness = opts.Get("brightness").Int()
  m.Contrast = opts.Get("contrast").Int()

  if opts.Get("halftoneBase64").Truthy() {
      b64 := opts.Get("halftoneBase64").String()
      decoded, err := base64.StdEncoding.DecodeString(b64)
      if err == nil {
          m.SetFile(decoded)
      } else {
          console.Call("error", "[QART] invalid base64 in halftoneBase64")
          return "error: invalid base64 in halftoneBase64"
      }
  }

  // 可選 halftone 圖片（第三個參數，Uint8Array）
  if len(args) >= 3 {
    halftoneBytes := make([]byte, args[2].Length())
    js.CopyBytesToGo(halftoneBytes, args[2])
    m.SetFile(halftoneBytes)
  }

  // 編碼
  png, err := m.Encode()
  if err != nil {
    console.Call("error", "[QART] Encode error:", err.Error())
    return "error: " + err.Error()
  }

  // 轉成 Base64，回給 JS
  buf := bytes.NewBuffer(nil)
  buf.Write(png)
  // 轉成 base64 字串
  b64 := base64.StdEncoding.EncodeToString(buf.Bytes())

  // 包成物件回傳，前端 utils.ts 可以直接讀 result.base64EncodedImage
  return map[string]interface{}{
      "base64EncodedImage": b64,
      "success": true,
  }
}
