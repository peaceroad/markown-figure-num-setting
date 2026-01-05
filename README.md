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

![](image.jpg)

段落。段落。段落。

図2 キャプション

![](image.jpg)

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

![](image.jpg)

段落。段落。段落。

図2 キャプション

![](image.jpg)

段落。段落。段落。


[Input]
段落。段落。段落。

Figure. キャプション

![](image.jpg)

段落。段落。段落。

Figure. キャプション

![](image.jpg)

段落。段落。段落。

[Output]
段落。段落。段落。

Figure 1. キャプション

![](image.jpg)

段落。段落。段落。

Figure 2. キャプション

![](image.jpg)

段落。段落。段落。
```


## Option

### setNumberAlt

Default behavior leaves image alt text unchanged. Set `setNumberAlt: true` to add the label number to alt.

```
[Input]
図 キャプション

![ALT-A](image.jpg)

図 キャプション

![ALT-B](image.jpg)

[Output]
図1 キャプション

![図1](image.jpg)

図2 キャプション

![図2](image.jpg)
```
