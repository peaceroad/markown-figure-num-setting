# markown-figure-num-setting

Set Figure number.

```
import setMarkdownFigureNum from '@peaceroad/setMarkdownFigureNum'

setMarkdownFigureNum(markdownCont)
```

```
[Input]
段落。段落。段落。

図 キャプション

![](image.jpg)

段落。段落。段落。

図 キャプション

![](image.jpg)

段落。段落。段落。

[Output]
段落。段落。段落。

図1 キャプション

![図1](image.jpg)

段落。段落。段落。

図2 キャプション

![図2](image.jpg)

段落。段落。段落。



[Input]
段落。段落。段落。

図1 キャプション

![](image.jpg)

段落。段落。段落。

図2 キャプション

![](image.jpg)

段落。段落。段落。

[Output]
段落。段落。段落。

図1 キャプション

![図1](image.jpg)

段落。段落。段落。

図2 キャプション

![図2](image.jpg)

段落。段落。段落。
```
