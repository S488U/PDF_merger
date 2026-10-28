# PDF Tools

This is a PDF Editing Application built for my personal Use, And I personally host this on my Vercel account which is free.

My main use case:
- Merge PDF
- Deleting Unwanted Pages
- Viewing Pages
- Splitting 1 Page into two Sections
- Rotate Pages
- Drag & Drop Pages to arrange.
- Good Mobile Drag & Drop Support and UX.

---
## About UI, UX, Features
 
> If you have any new idea about adding a feature or it will be a UX suggestion that makes the application runs smoother and powerful, you can suggest it.

And I would like to have the app with modern user interface and modern UX, that is also responsive. 

---
## Tools
Package Manager: Bun

---

## Current Working

The web currently works in two phases;
  1. The web normally works using express server and server the html pages from the public. It use nodeJS under the hood.
  2. The web use vercel's serverless function to get works in vercel's edge runtime. It also serve the static files from the public directory.

## Planned Items

I would like to purge the current architecture and use modern architecture that fully works. I think the best way is NextJS. And also Typesafety is one of the best concern nowadays. 

I prepare a MIGRATION.md file long ago, but I dont know how valid that till now. I also don't know whether there is a new NextJS version or any other libraries moves to new versions.

## New Architecture Design

I want you to design a new architecture, plan's to migrate and working of the same application features and functionalities in a new stack.

Move the runtime entirely to Bun for faster download speed. 

## Git & Github

The Project is currently added to my remote repository at github. But the last work I done previously were didn't added to git. But I want you to take over the work and do it.

As you know I use Atomic commit style and I want you to follow my commit style and as well as my message style. 

You can add, commit, merge, create branches, revert, rebase files in git without my permission. 

```notes
Make sure the application meets all parity functions as before.
```