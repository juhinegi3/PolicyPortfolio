# Juhi's portfolio

## Changing the writing in an opinion piece

1. Open the piece's file in this repository, for example `piece-subject-choice.txt`.
2. Click the pencil icon at the top right of the file.
3. Change the words, then click **Commit changes**.

The live site updates within a couple of minutes.

## How a piece file is laid out

```
title: The title shown on the page
date: 2024-06-24
summary: One line shown under the title on the Opinions page.
standfirst: Optional. A short italic introduction shown under the title.
link: Optional. A web address, if the piece was first published elsewhere.
---

First paragraph.

Second paragraph. Leave a blank line between paragraphs.

## A subheading starts with two hash marks and a space

Paragraph under the subheading.
```

- Use `YYYY-MM-DD` for a full date, or `YYYY-MM` when only the month is known.
- Keep the `---` line. Everything above it is details about the piece, and everything below it is the writing.

## Adding a new piece

1. Create a new file, for example `piece-my-new-piece.txt`, laid out as above. File names use lowercase letters, numbers and hyphens only.
2. Open `pieces.txt`, add the file name on a new line without `.txt`, and commit.

## Removing a piece

Delete its line in `pieces.txt`. The text file can stay or be deleted.
