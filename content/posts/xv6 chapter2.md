---
title: xv6 chapter2
subtitle: Operating system organziation
date: 2026-11-12T15:00:13+08:00
slug: xv6-chapter-2
draft: false
description:
keywords:
weight: 0
categories:
  - 学习
collections:
  - xv6
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

The operating system will help you manage your programs.

</p>


<p style="font-size: 13px; color: light-dark(#888, #9aa3b2); letter-spacing: .1em; text-align: right; margin: 40px 0 0;">— 2026/11/11</p>

</div>

# Operating system organization

An operating system should satisfy three requirements:

1. multiplexing
    The operating system must support several activities at once,sharing resources such as CUPs and memory among them.
2. isolation
    The operating system should ensure that when a process occurs bugs,it won't affect other processes.
3. interaction
    Different processes need to interact,such as pipelines.

## Why operating systems?

- achieve strong ioslation.Avoid the influence among processes.
- provide abstract resources and interface such as `open`,`read`and `write`,so that operating system take the responsibility of manage the disk.
- transparently switches CPUs among process.Save the state of registers.

## User mode,supervisor mode and system calls

To achieve string isolation,CPUs provide hardware support.RISC-V has three privilege levels which constrain what code can do: **machine mode**, **supervisor mode**, **user mode**.

machine mode has full privilege,which is mostly intended for setting up the computer during boot.Xv6 executes briefly in machine mode and then changes to supervisor mode.

In supervisor mode,the CPU is allowed ti execute privileged instructions such as system calls.If in user mode,CPU doesn't execute the priviledge instruction,but "traps" to special code in supervisor mode.

An application can execute only user-mode instructions and is said to be running in *user space*,while the software in supervisor mode can also execute privileged instructions and is said to be running in *kernel space*.The software running in kernel space is called the *kernel*

## xv6 organization

<u>**monolithic kernel**</u> The entire operating system resides in the kernel space.
<u>**microkernel</u> Parts of operating system retains in the user space.

xv6 is implemented as a monolithic kernel like Linux and most Unix operating systems.

The xv6 kernel source is in the `kernel/` sub-directory.Files are divided into major areas of kernel responsibility:

1. starting the system(booting)

2. creating and controlling process

3. handling traps

4. allocating memory and configuring virtual addresses

5. controlling devices

6. managing the file-system

![alt text](/posts/image-2.png)

## Process overview

Process is regarded as an instance of program, which provides kits with program.

Xv6 use page tables(which are implemented by handware) to give each process its own address space.The RISC-V page table translate a *virtual address* to *physical address*.

Xv6 maintains a seperate page tabe for each process that defines that process's address space.
The layout of virutal address space is like following:

![alt text](/posts/image-3.png)

Instructions -> global variables -> stack -> heap
When looking up virtual addresses in page tables,the handware uses only the low 39 bits;and xv6 uses only 38 of those 39 bits.

Thus,the maximum address is 0x3fffffffff,which is `MAXVA`(maximum virtual address).

At the top of the address space, xv6 places a *trampoline page* and a *trapframe page*,which are used to transition into the kernel and back.

The page contains the code to transition in and out of the kernel, and the trapframe os where the kernel saves the process's user registers.

The xv6 kernel maintains many pieces of state for each process which is gathered into a `struct proc`.

The significant pieces of the `proc`:

- page table
- kernel stack
- run state

Each process has a thread of control that holds the state needed to execute and process.Concretely,to switch a CPU among processes, the kernel suspends the thread currently running on that CPU and save its state and restore the state of another process's prevously-suspended thread.

Each thread has two stacks: a user stack and a kernel stack.When the process is executing user instructions,only the user stack is in use while the kernel stack is empty;when the process enters the kernel,the kernel code executes on the process's kernel stack;while a process is in the kernel,its user stack still contains saved data but not actively used.And the kernel stack is seperate from the user stack.

A process's user code can make a system call by executing the RISC-V `ecall` instruction.This instruction switches to supervisor mode and changes the program counter to a kernel-defined entry point.
The code at the entry point switches to the kernel stack and executes the code the system call implements.

When system call completes,the kernel returns to user space by executing the `sret` instruction.

```C
typedef int pagetable_t

enum procstate { 
    UNUSED, 
    USED, 
    SLEEPING, 
    RUNNABLE, 
    RUNNING, 
    ZOMBIE 
};

struct proc{
    uint64 kstack;//the virtual address of the kernel stack
    pagetable_t pagetable;//user page table
    enum proctstate state; //the state of the process
    /*other fields*/
}
```

- <u>`state`</u> indicates the state of the process.

- <u>`pagetable`</u> holds the process's page table.


