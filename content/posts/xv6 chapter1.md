---
title: xv6 chapter1
subtitle: Operating system interfaces
date: 2026-11-11T15:24:13+08:00
slug: xv6-chapter-1
draft: false
description:
keywords:
weight: 0
categories:
  - xv6
collections:
  - 
tags:
  - xv6
summary:
featured_image:
featured_image_preview:
password:
message:
repost:
  enable: false
  url:

# See: https://fixit.lruihao.cn/docs/content-management/front-matter/
---
<div style="max-width: 620px; margin: 56px auto; font-family: 'Noto Serif SC','Songti SC',Georgia,serif; color: light-dark(#2b2b2b, #d1d5db); line-height: 2;">

<p style="font-size: 11px; letter-spacing: .5em; text-transform: uppercase; color: light-dark(#888, #9aa3b2); margin: 0 0 24px;">Preface</p>


<div style="width: 36px; height: 1px; background: light-dark(#111, #e1e6ed); margin-bottom: 34px;"></div>

<p style="font-size: 15px; text-align: justify; text-justify: inter-ideograph; margin: 0 0 18px;">

Let us go to the world of xv6.

</p>


<p style="font-size: 13px; color: light-dark(#888, #9aa3b2); letter-spacing: .1em; text-align: right; margin: 40px 0 0;">— 2026/11/11</p>

</div>
> This markdown was established to record my journey of learning risc-v xv6 system.And it is written in English on purpose

## Operating System

An operating system is designed to manages and abstracts the low-level hardware.

To keep each process isolated, the kernel use hardware protection mechanisms provided by CPU.When more permissions are needed(the function-like calling is known as system call),the user program invokes a system call,the hardware raises the privilege level

## Process and memory

An xv6 process consists of user-space memory.

All C library are not allowed to use.Because it depends on the x86/AMD assembly while the xv6 operating system is based on risc-v.

Luckily,most of useful functions are provided.We can check all functions ,which is able to be called freely,in `user/user.h`

All right.Let us gain an inspection on some of functions provided

1. `fork`

    **function signature**

    ```C
    int fork()
    ```

    `fork` is used to create a child process which possess a exact copy of the calling process's memory.`fork` copy everything of calling process into the new process's memory.

    Just like we know,`fork` returns in both original and new processes.In the original process,it returns the new process's PID,while in the new process,it returns zero.If receiving a negative number,it means that fork failed.

2. `exit`

    **function signature**

    ```C
    int exit(int status)
    ```

    `exit` system call causes the calling process to stop and release resource such as memory and file descriptor

    When calling `exit`,a status argument is reuquired.Convetionally,0 indicates success and 1 stands for failure

3. `wait`

    **function signature**

    ```C
    int wait(int* status)
    ```

    Unlike `wait` in Linux,`wait` in xv6 is similar to `waitpid(-1,&status,0)` in Linux.

    it returns the PID of an exited child process and copies the exit status of the child to the address passed to wait.

    if none of the caller's children has exited,`wait` waits for one to do so.If the caller has no children,`wait` returns -1 immediately.

    Supposing the caller have no interest in the status of a child,passing 0(also NULL) is allowed.

4. `exec`

    **function signature**

    ```C
    int exec(char *file, char *argv[])
    ```

    Just like the `execve` in Linux,`exec` system call replaces the calling process's memory with a new memory image loaded from a file stored in the file system.Xv6 operating system uses ELF format as executable program.

    Considering `exec` succeeds,it does not return.If it returns,we can ensure `exec` has failed

    When calling `exec`,two arguments are passed:the path of the executable file and an array of string arguments(the path included).

## I/O and File descriptors

*file descriptor* is a small integer representing a kernel-managed object that a process may read from or write to.

To clarify it,a file descriptor is obtained while opening a file,directory,device or by creating a pipe.

The xv6 kernel uses descriptor as an index into a per-process table.Every process has a private space of file descriptor starting at zero.

By convention,a process reads file descriptor 0(standard input),writes output to file descriptor 1(standard output),writes error messages to file desciptor 2(standard error).

1. `read` and `write`

    **function signature**

    ```C
    int read(int fd, char *buf, int n)
    int write(int fd, char *buf, int n)
    ```

    `read` is used to read n bytes at most from the file descriptor and store them into buf.

    > NOTICE: `read` always not ensure n bytes are read

    `read` returns the number of byte read as a matter of fact.

    So,when calling `read`,we always need to use *while*,if continuing calling `read`,`read` reads data from the current file offset.(the offest is stored by `struct file`)

    In xv6,`read` is not only used to read file but directory.When reading the directory,the files(including directory) are abstracted as a array of `dirent`.

    ```C
    struct dirent {

        ushort inum;
        char name[DIRSIZ] __attribute__((nonstring));
    };
    ```
    Each `read` just reads one single `dirent`,so it is a good choice to use `while` to read all files in current directory.

    > So,what is file descriptor in fact?

    > We can regard a file descriptor as an index of the files kept in kernel.

    > In fact, the profile of file is in `struct file`,including reference count, flags ,file offset and so on.Check it in `linux/fs.h`

2. `open` and `close`

    **function signature**

    ```C
    int open(char *file, int flags)
    int close(int fd)
    ```

    The second parameter of `open` is flags,which includes `O_RDOLNY`,`O_WRONLY`,`O_RDWR`,`O_CREATE`,`O_TRUNC`.They are defined in `fcntl.h` and obvious.

    The kernel will choose a smallest usable number as file descriptor.

    `close` system call is used to close the file descriptor instead of the file.In a word,We just change the reference count of file.When the count of reference is zero,the `struct file` is released.

3. `dup`

    **function signature**

    ```C
    int dup(int fd)
    ```

    `dup` is the short for "duplicate",which works as duplicating the file descriptor pointing the same file and increasing the count of reference.

    When calling `fork`,everything is almost copied to the new process,and the `struct file` included.

## Pipes

*pipe* is small kernel buffer exposed to processes as a pair of file descriptors,one for reading and one for writing.Pipes provide a way for interprocess communication.

**function signature**

```C
int pipe(int pipefd[2]);
```

`pipe` system call initialize a two-element array,one for reading and another for writing.

Let us have a look an example provided by Linux documentation.

```C
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <sys/wait.h>
#include <unistd.h>

int main(int argc, char *argv[])
{
    int    pipefd[2];
    char   buf;
    pid_t  cpid;

    if (argc != 2) {
        fprintf(stderr, "Usage: %s <string>\n", argv[0]);
        exit(EXIT_FAILURE);
    }

    if (pipe(pipefd) == -1) {
        perror("pipe");
        exit(EXIT_FAILURE);
    }

    cpid = fork();
    if (cpid == -1) {
        perror("fork");
        exit(EXIT_FAILURE);
    }

    if (cpid == 0) {    /* Child reads from pipe */
        close(pipefd[1]);          /* Close unused write end */

        while (read(pipefd[0], &buf, 1) > 0)
            write(STDOUT_FILENO, &buf, 1);

        write(STDOUT_FILENO, "\n", 1);
        close(pipefd[0]);
        _exit(EXIT_SUCCESS);

    } else {            /* Parent writes argv[1] to pipe */
        close(pipefd[0]);          /* Close unused read end */
        write(pipefd[1], argv[1], strlen(argv[1]));
        close(pipefd[1]);          /* Reader will see EOF */
        wait(NULL);                /* Wait for child */
        exit(EXIT_SUCCESS);
    }
}
```

<u>**How does it work?**</u>

We call `pipe` to initialize two file descriptor,one for writing and another for reading.And when forking, the pair of file descriptors are copied.For safety,it is a must to close the useless end(1 indicates writing end ,0 indicates reading end).

When we call `write` on write-end,the data is written into pipe blocked.

When we call `read` on read-end,the data is read into buffer.However, if there is no data in the stream,read will wait for either data to be written or for all file descriptors referring to the write end to be closed.In the latter case,`read` will return 0,just as if the EOF had been reached.

In the xv6 shell `|` is regarded as pipelines because it works just like a pipe and pass the output current instruction to next instruction as the input.
