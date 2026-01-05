# markown-figure-num-setting

Set Figure number.

```
import setMarkdownFigureNum from '@peaceroad/setMarkdownFigureNum'

setMarkdownFigureNum(markdownCont)
```

```
[Input]
Paragraph. 

Figure. A Caption

![A alt text.](image.jpg)

Paragraph. 

Figure. A Caption

![A alt text.](image.jpg)

Paragraph. 

[Output]
Paragraph. 

Figure 1. A Caption

![A alt text.](image.jpg)

Paragraph. 

Figure 2. A Caption

![A alt text.](image.jpg)

Paragraph. 


[Input]
Paragraph. 

Figure 1. A Caption

![A alt text.](image.jpg)

Paragraph. 

Figure 1. A Caption

![A alt text.](image.jpg)

Paragraph. 

[Output]
Paragraph. 

Figure 1. A Caption

![A alt text.](image.jpg)

Paragraph. 

Figure 2. A Caption

![A alt text.](image.jpg)

Paragraph. 


[Input]
段落。段落。段落。

図 キャプション

![A alt text.](image.jpg)

段落。段落。段落。

図 キャプション

![A alt text.](image.jpg)

段落。段落。段落。

[Output]
段落。段落。段落。

図1 キャプション

![A alt text.](image.jpg)

段落。段落。段落。

図2 キャプション

![A alt text.](image.jpg)

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
