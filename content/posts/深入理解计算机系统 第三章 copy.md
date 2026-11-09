---
title: 深入理解计算机系统 第六章
subtitle: 进程与信号
date: 2026-11-09T08:35:13+08:00
slug: 583bc6c
draft: false
description:
keywords:
weight: 0
categories:
  - CSAPP学习笔记
collections:
  - CSAPP学习笔记
tags:
  - CSAPP
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

<p style="font-size: 15px; text-align: justify; text-justify: inter-ideograph; margin: 0 0 18px;">这些笔记写于大一加入凌睿工作室招新期间，更多的是知识的回顾，我将这些笔记记录下来，纪念那段奋斗的时光</p>


<p style="font-size: 13px; color: light-dark(#888, #9aa3b2); letter-spacing: .1em; text-align: right; margin: 40px 0 0;">— 2026/11/9</p>

</div>

# 进程

进程是程序的一次执行实例

每个进程都有独属于自己的内存区域（相互独立的堆栈等）

每个进程都有独属于自己的自己的<u>**进程 ID（PID）**</u>

## 创建进程

使用 `fork()` 函数可以创建子进程，物理页先共享并设为只读，任一进程写入时触发缺页异常，内核再复制该页。这就是 写时复制 COW

## 覆盖进程

使用 `exec` 类函数能够将硬盘中指定的可执行文件加载到当前进程中，覆盖掉几乎全部内容。当以下内容不变

- PID，进程所在进程组和会话
- 打开的文件描述符
- 信号掩码

> 特别注意：信号处理函数会被重置
系统调用：`execve`

```
int execve(const char *pathname, char *const argv[], char *const envp[]);
```

- <u>**`pathname`**</u>：为程序的绝对路径或相对路径，不回去找 PATH
- <u>**`argv`**</u>：表示命名行参数数组，以 `NULL` 结尾
- <u>**`envp`**</u>：是环境变量数组，以 `NULL` 结尾

<u>**返回值**</u>：失败时返回-1，并设置`errno`

剩余 5 个 `exec` 的类函数都是由 `execve` 函数包装而成

可以通过后缀字母窥见其含义：

- `l(list)`：参数以列表（可变参数）的形式传递
- `v(vector)`：参数以字符串数组的形式传递
- `e(environment)`：自定义环境变量
- `p(path)`：当 `path` 参数为以 `/` 起始时，运行指定路径程序，当 `path` 参数不以 `/` 起始的，从 `PATH` 中搜索

规则如下：

1. 当指定环境变量时，使用自定义的环境变量，否则使用当前进程中的 `environ`

    > 每个进程中都有一个全局变量 `char** environ`，当 `fork` 时，创建的子进程会复制父进程的 `environ`

2. `PATH` 是一个环境变量，其一般格式：

    ```
    PATH=/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin
    ```
    当使用含 `p` 后缀的函数时，且 `path` 参数不以 `/` 起始时(如 `ls`)，会依次尝试
    ```
    /usr/local/bin/ls
    /usr/bin/ls
    ...
    ```
其余 5 个函数分别为 `execl`，`execvp`，`execlp`，`execv`，`execle`

# 进程组

进程组是一个进程的集合，通常表示一个**作业（job）**

每个进程只属于一个进程组，在使用 `fork` 创建子进程时，默认子进程属于父进程所在进程组

多个进程组组成一个**Session（会话）**

## 前台进程组

前台进程组是一个重要的概念，它是当前 Session 中唯一被赋予控制终端并独占访问权的进程组

在同一时刻，只有一个进程组能被设为前台进程组，如果不是前台进程组，那就是后台进程组

### 特性

- <u>**`接收键盘产生的信号`**</u> 当在当前 Session 按下对应的键时，会把信号发送给**前台进程组中的全体成员**
- <u>**`读取终端`**</u> 前台进程组可以不受限制地从终端读取输入，而后台进程组一旦尝试读取终端，终端会向该进程组发送 `SIGTTIN`，暂停该进程组

> 向终端写入时，终端驱动有一个 `TOSTOP` 标志，默认关闭，当该标志关闭时，后台进程组可以向控制终端写入而不被阻止

## shell 进程组

交互式 shell 本身就是一个进程，所在进程组默认时其就为前台进程组

### 特殊之处

- <u>**`信号处理特殊`**</u>

会忽略信号：`SIGINT`，`SIGQUIT`，`SIGTSTP`，`SIGTTIN`，`SIGTTOU`

- <u>**`作业控制特殊`**</u>

1. 不在 `jobs` 输出中
2. 不能被 `fg/bg` 管理
3. 不能被 `Ctrl-Z` 观其

## 前后台进程组切换

1. <u>**`挂起前台作业`**</u> 在前台进程组使用 `Ctrl-Z` 向其发送 `SIGTSTP` 信号，使其挂起，该作业变为后台作业

2. <u>**`后台/挂起作业变为前台作业`**</u> 使用 `fg` 会将指定作业设为前台作业，并向其发送 `SIGCONT` 信号

    > fg 背后调用的是 `tcsetpgrp`（terminal control set process group），其能够设置前台进程组，与之对应的函数还有 `tcgetpgrp`（terminal control get process group），获取前台进程组

3. <u>**`继续后台运行挂起作业`**</u> 使用 `bg` 向指定挂起作业发送 `SIGCONT`，并让其在后台运行

# 进程生命周期

每个进程都有一个（Process Control Block），其记录着进程的状态，标识信息等，可以说，PCB 是进程的档案袋

在 Linux 中，PCB 的具体实现是 `task_struct`，这是一个复杂且庞大的结构体，后面在深入再学习

## <u>**`创建`**</u>

使用 `fork` 函数创建，一般呢，会调用 `execv` 类函数

## <u>**`阻塞`**</u>

当进程内调用 `wait`，`sleep`，`read` 等函数时，会进入阻塞状态，待到指定事件完成后，会自动恢复为运行状态

阻塞分为两种：

- *Interruptible Sleep（S）* 能被信号唤醒，大多数阻塞属于这一类型
- *Disk Sleep（D）* 不能被信号唤醒，一般是 I/O 操作

## <u>**`暂停`**</u>

当进程收到 `SIGTSTP` 或 `SIGSTOP` 信号时，进程暂停，当接收到 `SIGCONT` 信号时，进程恢复到 R 态

## <u>**`终止`**</u>

终止分为两类

- *正常终止* 通过 `main` 函数正常返回或通过 `exit/_exit` 终止，退出状态码通过 `wait` 交给父进程
- *异常终止* 接收到触发异常终止的信号：`SIGINT`，`SIGQUIT`，`SIGSEGV`，`SIGTERM`，`SIGKILL` 等，可以通过 `wait` 获取 `status` 查看终止信号

当进程终止后，会进入僵尸状态（Z），等待父进程收尸

## <u>**`回收`**</u>

当子进程变为僵尸进程后，需要父进程使用 `wait/waitpid` 为子进程收尸

```
pid_t wait(int *_Nullable wstatus);
pid_t waitpid(pid_t pid, int *_Nullable wstatus, int options);
```

`waitpid` 函数是 `wait` 的上位替代，所以这里重点讲解 `waitpid`
参数：

  - <u>`pid`</u>：详细规则如下表

    | <-1 | -1  |  0  | >0  |
    | :-: | :-: | :-: | :-: |
    | 等待与 `pid` 绝对值相等的进程组内所有子进程 | 等待所有子进程 | 等待同进程组内所有子进程 | 等待 `pid` 所对应的子进程 |

  - <u>`options`</u>

    使用掩码进行传参
    有三种选择

    | WNOHANG | WUNTRACED | WCONTINUED |
    | :-----: | :-------: | :--------: |
    | 如果没有子进程为僵尸进程则立即返回 | 如果一个子进程在暂停状态也会返回，且会记录在 `status` 中 | 如果子进程被 `SIGCONT` 信号恢复了也会返回 |

    当不使用 `WNOHANG` 时，`waitpid` 会一直等待指定子进程终止并收尸才返回，使用后如果就把等待变成询问，问一下子进程是否终止，终止就收尸，否则立即返回

    当不使用 `WUNTRACED` 时，`waitpid` 会对不关心进程是否暂停，使用后，如果暂停，waitpid 也会立即返回，而且可以通过 `status` 得到是因为暂停返回还是终止返回

    `WCONTINUED` 与 `WUNTRACED` 类似

  - <u>`wstatus`</u> `wstatus` 需要传一个 int 指针，`wait` 函数会把僵尸进程的信息写入 `wstatus` 中，并通过指定宏读取 `wstatus` 以获取信息，下面是常见宏

    |WIFEXITED|WEXITSTATUS|WIFSIGNALED|WTERMSIG|WIFSTOPPED|WSTOPSIG|WIFCONTINUED|
    |:--:|:--:|:--:|:--:|:--:|:--:|:--:|
    |判断进程是否正常终止|获取正常终止时的退出状态码|判断进程是否是由于信号终止|获取使进程终止的信号|判断进程是否是在暂停（`options` 必须使用 `WUNTRACED`）|获取让进程暂停的信号|判断进程是否被 `SIGCONT` 恢复了|

`wait(wstatus)` == `waitpid(-1,wstatus,0)`

`waitpid` 函数每次返回只会处理一个子进程

返回值：

| -1  |  0  | >0  |
| :-: | :-: | :-: |
| 无法找到对应子进程或被信号中断 | 只有在 `WNOHANG` 的条件下才可能返回 0，代表没有找到了子进程，但其不为可报告的进程 | 成功，返回对应处理的子进程的 `pid` |

`waitpid` 能够回收僵尸进程，但必须要父进程调用才行了，那么问题来了，如果一个进程没有父进程，该怎么回收呢？这种没有父进程（或者说父进程已经终止）的进程称为孤儿进程

孤儿进程不需要我们操心了，内核会给孤儿找养父，让养父来为孤儿收尸，所以孤儿一般不会长期僵尸

# 信号

在上面我们已经知道信号与进程紧密相连的，能够实现进程间的简单通信

## 信号的生命周期

### 产生

可由硬件，终端和内核产生，也可通过 `kill`，`raise` 方法手动发送信号

### 阻塞

进程设置信号掩码，表示该进程暂不接收某些信号

```
sigset_t new_mask, old_mask;
   
// 初始化新信号集，只包含 SIGINT
sigemptyset(&new_mask);
sigaddset(&new_mask, SIGINT);

// 设置新的信号屏蔽字，阻塞 SIGINT 信号
sigprocmask(SIG_BLOCK, &new_mask, &old_mask);
```

解除信号屏蔽

```
sigprocmask(SIG_UNBLOCK, &new_mask, &old_mask);
```

### 处理

进程接收到信号后，调用对应的信号处理函数进行处理，如果没有注册则会调用默认的处理函数，否则调用用户注册的函数

注册信号处理函数一般使用 `sigaction` 函数
函数原型

```
 int sigaction(int signum,
 const struct sigaction *_Nullable restrict act,
 struct sigaction *_Nullable restrict oldact);
```

其中：

  - <u>`signum`</u>：表示需要注册函数的信号码（不可以是 `SIGKILL` 或 `SIGSTOP`，不能为这两个信号注册函数）
  - <u>`act`</u>：新的信号处理指针，可为 `NULL`，表示不修改
  - <u>`oldact`</u>：保存旧的信号处理指针，可为 `NULL`，表示不保存

两个信号处理指针都是 sigaction 结构体指针

```C
struct sigaction {
    void     (*sa_handler)(int);
    void     (*sa_sigaction)(int, siginfo_t *, void *);
    sigset_t   sa_mask;
    int        sa_flags;
    void     (*sa_restorer)(void);
};
```

其中 `sa_handler` 和 `sa_sigaction` 是二选一

## 常见信号

|  `SIGINT`  | `SIGKILL`  | `SIGSTOP` | `SIGTSTP` | `SIGCHLD` | `SIGCONT` |
| :--------: | :--------: | :-------: | :-------: | :-------: | :-------: |
| Terminated | Terminated |  Stopped  |  Stopped  |  Ignore   | Continue  |

重点在`SIGCHLD`信号，在子进程终止，暂停和继续时，父进程都会收到`SIGCHLD`信号，一般我们通过`waitpid`方法获得子进程相关信息进行收尸处理

信号的一大特点是：**信号不排队，也没有引用计数**

这也就意味着，当多个子进程终止时，父进程只会收到一个`SIGCHLD`信号，因此，在为子进程收尸时，我们会使用循环保证处理所有需要的子进程
