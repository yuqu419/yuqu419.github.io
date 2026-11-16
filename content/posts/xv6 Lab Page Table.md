---
title: xv6 Lab Page Table
subtitle: 浅析 xv6 中的页表机制
date: 2026-11-16T15:30:13+08:00
slug: xv6-lab-pagetable
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

虚拟地址如何找到物理地址呢？


</p>

<p style="font-size: 13px; color: light-dark(#888, #9aa3b2); letter-spacing: .1em; text-align: right; margin: 40px 0 0;">— 2026/11/16</p>

</div>

## 三级索引机制

xv6 中，64 位虚拟地址只有低 39 位被使用，低 39 位中的前 27 位被拆成 3 个 9 位的索引，也就是三级索引。之所以每级索引占 9 位，是因为这个索引索引的是页表项（PTE），每个 PTE 占 8 个字节，故每页有 512 个 PTE

后 12 位表示页内偏移量，因为一页大小为 4096bytes，故 offset 需要 12 位表示

`satp` 寄存器保存着根页表的**物理地址**

> 在实际使用中，xv6 将虚拟地址限制在 38 位，在 `kernel/riscv.h` 中定义了 `#define MAXVA (1L << (9 + 9 + 9 + 12 - 1))`。在 RISC-V 标准中，第 39 位作为符号位出现，标记位不同的区域，用户地址空间位于正半区，而内核地址空间位于负半区。但 xv6 为了简化设计，弃用了负半区，转而在 `kernel/memlayout.h` 中设定了 `#define KERNBASE 0x80000000L`，高于 `KERNBASE` 的空间就是内核地址空间了

<div style="position:relative;width:900px;height:580px;margin:0 auto;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:#cbd5e1;font-size:14px;">
  <svg style="position:absolute;top:0;left:0;width:900px;height:580px;z-index:0;pointer-events:none;">
    <defs>
      <marker id="ab" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto"><path d="M0,0 L10,5 L0,10 z" fill="#45aaf2"/></marker>
      <marker id="ar" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto"><path d="M0,0 L10,5 L0,10 z" fill="#eb3b5a"/></marker>
    </defs>
    <!-- 虚拟地址连线 (蓝) -->
    <path d="M 240 72 L 240 200 L 170 200 L 170 255" fill="none" stroke="#45aaf2" stroke-width="1.5" marker-end="url(#ab)"/>
    <path d="M 340 72 L 340 310" fill="none" stroke="#45aaf2" stroke-width="1.5" marker-end="url(#ab)"/>
    <path d="M 440 72 L 440 380" fill="none" stroke="#45aaf2" stroke-width="1.5" marker-end="url(#ab)"/>
    <path d="M 520 72 L 520 100 L 830 100 L 830 72" fill="none" stroke="#45aaf2" stroke-width="1.5" marker-end="url(#ab)"/>
    <!-- 物理地址连线 (红) -->
    <path d="M 80 490 L 80 380 L 70 380" fill="none" stroke="#eb3b5a" stroke-width="1.5" marker-end="url(#ar)"/>
    <path d="M 135 380 L 135 420 L 405 420 L 405 450" fill="none" stroke="#eb3b5a" stroke-width="1.5" marker-end="url(#ar)"/>
    <path d="M 405 450 L 405 480 L 675 480 L 675 520" fill="none" stroke="#eb3b5a" stroke-width="1.5" marker-end="url(#ar)"/>
    <path d="M 675 380 L 675 140 L 740 140 L 740 72" fill="none" stroke="#eb3b5a" stroke-width="1.5" marker-end="url(#ar)"/>
  </svg>
  
  <!-- 符号扩展提示 -->

  <div style="position:absolute;top:36px;left:80px;font-size:11px;color:#8b98a8;text-align:right;width:90px;line-height:1.4;">
    高 25 位必须与<br>bit 38 符号扩展一致<br>(bit 63:39)
  </div>

  <!-- 虚拟地址 -->

  <div style="position:absolute;top:20px;left:190px;width:460px;">
    <div style="text-align:center;margin-bottom:6px;">Virtual Address (Sv39)</div>
    <div style="display:flex;font-size:11px;color:#8b98a8;margin-bottom:4px;">
      <div style="width:100px;text-align:center;">9</div>
      <div style="width:100px;text-align:center;">9</div>
      <div style="width:100px;text-align:center;">9</div>
      <div style="width:160px;text-align:center;">12</div>
    </div>
    <div style="display:flex;border:1.5px solid #45aaf2;border-radius:4px;background:rgba(69,170,242,0.1);color:#45aaf2;font-family:ui-monospace,Menlo,monospace;font-size:13px;text-align:center;line-height:32px;">
      <div style="width:100px;border-right:1.5px solid #45aaf2;">VPN[2]</div>
      <div style="width:100px;border-right:1.5px solid #45aaf2;">VPN[1]</div>
      <div style="width:100px;border-right:1.5px solid #45aaf2;">VPN[0]</div>
      <div style="width:160px;">Offset</div>
    </div>
  </div>

  <!-- 物理地址 -->

  <div style="position:absolute;top:20px;left:680px;width:180px;">
    <div style="text-align:center;margin-bottom:6px;">Physical Address</div>
    <div style="display:flex;font-size:11px;color:#8b98a8;margin-bottom:4px;">
      <div style="width:120px;text-align:center;">44</div>
      <div style="width:60px;text-align:center;">12</div>
    </div>
    <div style="display:flex;border:1.5px solid #eb3b5a;border-radius:4px;background:rgba(235,59,90,0.1);color:#eb3b5a;font-family:ui-monospace,Menlo,monospace;font-size:13px;text-align:center;line-height:32px;">
      <div style="width:120px;border-right:1.5px solid #eb3b5a;">PPN</div>
      <div style="width:60px;">Offset</div>
    </div>
  </div>

  <!-- 一级页表 (Root, Level 2) -->

  <div style="position:absolute;top:240px;left:70px;width:200px;">
    <div style="display:flex;font-size:11px;color:#8b98a8;margin-bottom:4px;">
      <div style="width:130px;text-align:center;">PPN [53:10]</div>
      <div style="flex:1;text-align:center;">Flags [9:0]</div>
    </div>
    <div style="border:1.5px solid rgba(148,163,184,0.6);border-radius:6px;background:#161b22;overflow:hidden;font-family:ui-monospace,Menlo,monospace;font-size:13px;color:#cbd5e1;">
      <div style="display:flex;background:rgba(148,163,184,0.15);position:relative;height:30px;line-height:30px;text-align:center;">
         <span style="position:absolute;left:-30px;top:0;color:#8b98a8;font-size:11px;">511</span>
         <div style="width:130px;border-right:1.5px solid rgba(148,163,184,0.3);">PPN</div>
         <div style="flex:1;">Flags</div>
         <div style="position:absolute;left:65px;bottom:-4px;width:8px;height:8px;border-radius:50%;background:#eb3b5a;border:2px solid #161b22;"></div>
      </div>
      <div style="height:30px;background:repeating-linear-gradient(45deg,rgba(148,163,184,0.05),rgba(148,163,184,0.05) 10px,transparent 10px,transparent 20px);border-bottom:1.5px solid rgba(148,163,184,0.3);line-height:30px;text-align:center;color:rgba(148,163,184,0.5);">⋮</div>
      <div style="display:flex;height:30px;line-height:30px;text-align:center;border-bottom:1.5px solid rgba(148,163,184,0.3);position:relative;">
         <span style="position:absolute;left:-18px;top:0;color:#8b98a8;font-size:11px;">1</span>
         <div style="width:130px;border-right:1.5px solid rgba(148,163,184,0.3);">PPN</div>
         <div style="flex:1;">Flags</div>
      </div>
      <div style="display:flex;height:30px;line-height:30px;text-align:center;position:relative;">
         <span style="position:absolute;left:-18px;top:0;color:#8b98a8;font-size:11px;">0</span>
         <div style="width:130px;border-right:1.5px solid rgba(148,163,184,0.3);">PPN</div>
         <div style="flex:1;">Flags</div>
      </div>
    </div>
    <div style="text-align:center;font-size:14px;margin-top:8px;">Page Directory (Level 2)</div>
  </div>

  <!-- 二级页表 (Level 1) -->

  <div style="position:absolute;top:310px;left:340px;width:200px;">
    <div style="display:flex;font-size:11px;color:#8b98a8;margin-bottom:4px;">
      <div style="width:130px;text-align:center;">PPN [53:10]</div>
      <div style="flex:1;text-align:center;">Flags [9:0]</div>
    </div>
    <div style="border:1.5px solid rgba(148,163,184,0.6);border-radius:6px;background:#161b22;overflow:hidden;font-family:ui-monospace,Menlo,monospace;font-size:13px;color:#cbd5e1;">
      <div style="display:flex;background:rgba(148,163,184,0.15);position:relative;height:30px;line-height:30px;text-align:center;">
         <span style="position:absolute;left:-30px;top:0;color:#8b98a8;font-size:11px;">511</span>
         <div style="width:130px;border-right:1.5px solid rgba(148,163,184,0.3);">PPN</div>
         <div style="flex:1;">Flags</div>
         <div style="position:absolute;left:65px;bottom:-4px;width:8px;height:8px;border-radius:50%;background:#eb3b5a;border:2px solid #161b22;"></div>
      </div>
      <div style="height:30px;background:repeating-linear-gradient(45deg,rgba(148,163,184,0.05),rgba(148,163,184,0.05) 10px,transparent 10px,transparent 20px);border-bottom:1.5px solid rgba(148,163,184,0.3);line-height:30px;text-align:center;color:rgba(148,163,184,0.5);">⋮</div>
      <div style="display:flex;height:30px;line-height:30px;text-align:center;border-bottom:1.5px solid rgba(148,163,184,0.3);position:relative;">
         <span style="position:absolute;left:-18px;top:0;color:#8b98a8;font-size:11px;">1</span>
         <div style="width:130px;border-right:1.5px solid rgba(148,163,184,0.3);">PPN</div>
         <div style="flex:1;">Flags</div>
      </div>
      <div style="display:flex;height:30px;line-height:30px;text-align:center;position:relative;">
         <span style="position:absolute;left:-18px;top:0;color:#8b98a8;font-size:11px;">0</span>
         <div style="width:130px;border-right:1.5px solid rgba(148,163,184,0.3);">PPN</div>
         <div style="flex:1;">Flags</div>
      </div>
    </div>
    <div style="text-align:center;font-size:14px;margin-top:8px;">Page Directory (Level 1)</div>
  </div>

  <!-- 三级页表 (Level 0) -->

  <div style="position:absolute;top:380px;left:610px;width:200px;">
    <div style="display:flex;font-size:11px;color:#8b98a8;margin-bottom:4px;">
      <div style="width:130px;text-align:center;">PPN [53:10]</div>
      <div style="flex:1;text-align:center;">Flags [9:0]</div>
    </div>
    <div style="border:1.5px solid rgba(148,163,184,0.6);border-radius:6px;background:#161b22;overflow:hidden;font-family:ui-monospace,Menlo,monospace;font-size:13px;color:#cbd5e1;">
      <div style="display:flex;background:rgba(148,163,184,0.15);position:relative;height:30px;line-height:30px;text-align:center;">
         <span style="position:absolute;left:-30px;top:0;color:#8b98a8;font-size:11px;">511</span>
         <div style="width:130px;border-right:1.5px solid rgba(148,163,184,0.3);">PPN</div>
         <div style="flex:1;">Flags</div>
         <div style="position:absolute;left:65px;bottom:-4px;width:8px;height:8px;border-radius:50%;background:#eb3b5a;border:2px solid #161b22;"></div>
      </div>
      <div style="height:30px;background:repeating-linear-gradient(45deg,rgba(148,163,184,0.05),rgba(148,163,184,0.05) 10px,transparent 10px,transparent 20px);border-bottom:1.5px solid rgba(148,163,184,0.3);line-height:30px;text-align:center;color:rgba(148,163,184,0.5);">⋮</div>
      <div style="display:flex;height:30px;line-height:30px;text-align:center;border-bottom:1.5px solid rgba(148,163,184,0.3);position:relative;">
         <span style="position:absolute;left:-18px;top:0;color:#8b98a8;font-size:11px;">1</span>
         <div style="width:130px;border-right:1.5px solid rgba(148,163,184,0.3);">PPN</div>
         <div style="flex:1;">Flags</div>
      </div>
      <div style="display:flex;height:30px;line-height:30px;text-align:center;position:relative;">
         <span style="position:absolute;left:-18px;top:0;color:#8b98a8;font-size:11px;">0</span>
         <div style="width:130px;border-right:1.5px solid rgba(148,163,184,0.3);">PPN</div>
         <div style="flex:1;">Flags</div>
      </div>
    </div>
    <div style="text-align:center;font-size:14px;margin-top:8px;">Page Directory (Level 0)</div>
  </div>

  <!-- satp 寄存器 -->

  <div style="position:absolute;top:490px;left:20px;width:120px;height:40px;border:1.5px solid rgba(148,163,184,0.4);background:rgba(148,163,184,0.1);border-radius:6px;text-align:center;line-height:40px;font-family:ui-monospace,Menlo,monospace;font-weight:bold;color:#cbd5e1;box-shadow: 0 2px 4px rgba(0,0,0,0.2);">
    satp.PPN
  </div>
</div>

## PTE

PTE 即 Page Table Entry 译为页表项，每个 PTE 占 8 个字节。PTE 是页表的基本组成单元

PTE 是一个 64 位的整数，但 64 并非全部使用，部分留作未来扩展，有效的主要由两部分组成。

1. PPN(Physical Page Number)
PPN 是物理页号，占 44 位，这是 PTE 的核心，存储着映射的物理页的起始地址

2. Flags
Flags 记着该页的访问权限和状态，其中被 xv6 系统使用的有：
- <u>**V**</u> 第零位，作为有效位
- <u>**R**</u> 第一位，作为可读权限位
- <u>**W**</u> 第二位，作为可写权限位
- <u>**X**</u> 第三位，作为可执行权限位
- <u>**U**</u> 第四位，作为用户态权限位

xv6 定义了一些宏于 `kernel/riscv.h`，以方便访问

```C
#define PTE_V (1L << 0) // valid
#define PTE_R (1L << 1)
#define PTE_W (1L << 2)
#define PTE_X (1L << 3)
#define PTE_U (1L << 4) // user can access
```

另外还有 `PTE_G`（标记全局映射），`PTE_A`（访问位）和 `PTE_D`（脏位），xv6 使用较少

> 当 `PTE` 表示的下一级索引而非叶子时，标志位 `V` 位为 1，`R/W/X` 全为 0，这也是非叶子 PTE 的标志

当访问虚拟地址时，通过页表将虚拟地址映射为物理地址

$$

Physical Address(56bits) = PPN(44bits) + Offset(12bits)

$$

## `walk` 函数

`walk` 函数位于 `kernel/vm.c` 中，其主要作用就是按照三级索引下降，最终返回叶子 PTE 的指针

```C
// Return the address of the PTE in page table pagetable
// that corresponds to virtual address va.  If alloc!=0,
// create any required page-table pages.
//
// The risc-v Sv39 scheme has three levels of page-table
// pages. A page-table page contains 512 64-bit PTEs.
// A 64-bit virtual address is split into five fields:
//   39..63 -- must be zero.
//   30..38 -- 9 bits of level-2 index.
//   21..29 -- 9 bits of level-1 index.
//   12..20 -- 9 bits of level-0 index.
//    0..11 -- 12 bits of byte offset within the page.
pte_t * walk(pagetable_t pagetable, uint64 va, int alloc)
{
    if (va >= MAXVA) //判断传入的虚拟地址是否超过最大虚拟地址
        panic("walk"); //如果超过就触发恐慌
        //遍历三级索引
    for (int level = 2; level > 0; level--) {
        //提取索引
        pte_t *pte = &pagetable[PX(level, va)];
        //检查有效位
        if (*pte & PTE_V) {
        //将PTE转化为物理地址 
        pagetable = (pagetable_t)PTE2PA(*pte);

    #ifdef LAB_PGTBL
        if (PTE_LEAF(*pte)) {
            return pte;
        }
    #endif
        //有效位为0，判断是否分配新的物理页
        } else {
            //只查找，不分配
        if (!alloc || (pagetable = (pde_t *)kalloc()) == 0)
            return 0;
            //缺失是分配新的物理页
        memset(pagetable, 0, PGSIZE);
        *pte = PA2PTE(pagetable) | PTE_V;
        }

    }
    //返回物理页号
    return &pagetable[PX(0, va)];
    }
```

其中：

`PX` 宏定义在 `kernel/riscv.h` 中，用于提取每一级 VPN（Virtual Page Number），即每一级索引

```C
// extract the three 9-bit page table indices from a virtual address.
#define PXMASK         0x1FF // 9 bits
#define PXSHIFT(level) (PGSHIFT + (9 * (level)))
#define PX(level, va)  ((((uint64)(va)) >> PXSHIFT(level)) & PXMASK)
```

`PA2PTE` 与 `PTE2PA` 是 PTE 与物理地址互相转化的工具(这里的 `two` 是 `to`)，同样定义在 `kernel/riscv.h` 中

```C
// shift a physical address to the right place for a PTE.
#define PA2PTE(pa) ((((uint64)pa) >> 12) << 10)

#define PTE2PA(pte) (((pte) >> 10) << 12)
```

转化原理

**PTE**与**PA**结构如下

<div style="font-family: ui-monospace, Menlo, Consolas, monospace; font-size: 13px; max-width: 800px; margin: 20px 0; line-height: 1.5; color: inherit;">

  <!-- ================= 物理地址 PA ================= -->

  <div style="font-weight: 700; margin-bottom: 8px; font-size: 14px; opacity: 0.9;">
    物理地址 PA（56 位）
  </div>
  
  <div style="display: grid; grid-template-columns: 44fr 12fr; border: 1px solid rgba(148, 163, 184, 0.5); border-radius: 6px; overflow: hidden; height: 42px; text-align: center; font-weight: 600;">
    <div style="display: flex; align-items: center; justify-content: center; background: rgba(96, 165, 250, 0.15); color: #60a5fa; border-right: 1px solid rgba(148, 163, 184, 0.5);">
      PPN (44 位)
    </div>
    <div style="display: flex; align-items: center; justify-content: center; background: rgba(74, 222, 128, 0.15); color: #4ade80;">
      Offset (12 位)
    </div>
  </div>
  <div style="display: grid; grid-template-columns: 44fr 12fr; text-align: center; font-size: 11px; opacity: 0.6; margin-top: 4px; margin-bottom: 28px;">
    <div>bit 55 … 12</div>
    <div>bit 11 … 0</div>
  </div>

  <!-- ================= 页表项 PTE ================= -->

  <div style="font-weight: 700; margin-bottom: 8px; font-size: 14px; opacity: 0.9;">
    页表项 PTE（64 位）
  </div>
  
  <!-- 使用 11 列的 Grid，完美分配宽度比例：10, 44, 2, 1x8 -->

  <div style="display: grid; grid-template-columns: 10fr 44fr 2fr 1fr 1fr 1fr 1fr 1fr 1fr 1fr 1fr; border: 1px solid rgba(148, 163, 184, 0.5); border-radius: 6px; overflow: hidden; height: 42px; text-align: center; font-weight: 600; font-size: 12px;">
    <!-- Reserved (10位) -->
    <div style="display: flex; align-items: center; justify-content: center; background: rgba(148, 163, 184, 0.1); color: rgba(148, 163, 184, 1); border-right: 1px solid rgba(148, 163, 184, 0.3);">
      Resv
    </div>
    <!-- PPN (44位) -->
    <div style="display: flex; align-items: center; justify-content: center; background: rgba(96, 165, 250, 0.15); color: #60a5fa; border-right: 1px solid rgba(148, 163, 184, 0.3);">
      PPN (44 位)
    </div>
    <!-- RSW (2位) -->
    <div style="display: flex; align-items: center; justify-content: center; background: rgba(192, 132, 252, 0.15); color: #c084fc; border-right: 1px solid rgba(148, 163, 184, 0.3);">
      RSW
    </div>
    <!-- D A G U X W R V (各1位) -->
    <div style="display: flex; align-items: center; justify-content: center; background: rgba(239, 68, 68, 0.15); color: #ef4444; border-right: 1px solid rgba(148, 163, 184, 0.3);">D</div>
    <div style="display: flex; align-items: center; justify-content: center; background: rgba(249, 115, 22, 0.15); color: #f97316; border-right: 1px solid rgba(148, 163, 184, 0.3);">A</div>
    <div style="display: flex; align-items: center; justify-content: center; background: rgba(234, 179, 8, 0.15); color: #eab308; border-right: 1px solid rgba(148, 163, 184, 0.3);">G</div>
    <div style="display: flex; align-items: center; justify-content: center; background: rgba(132, 204, 22, 0.15); color: #84cc16; border-right: 1px solid rgba(148, 163, 184, 0.3);">U</div>
    <div style="display: flex; align-items: center; justify-content: center; background: rgba(20, 184, 166, 0.15); color: #14b8a6; border-right: 1px solid rgba(148, 163, 184, 0.3);">X</div>
    <div style="display: flex; align-items: center; justify-content: center; background: rgba(6, 182, 212, 0.15); color: #06b6d4; border-right: 1px solid rgba(148, 163, 184, 0.3);">W</div>
    <div style="display: flex; align-items: center; justify-content: center; background: rgba(59, 130, 246, 0.15); color: #3b82f6; border-right: 1px solid rgba(148, 163, 184, 0.3);">R</div>
    <div style="display: flex; align-items: center; justify-content: center; background: rgba(168, 85, 247, 0.15); color: #a855f7;">V</div>
  </div>
  
  <!-- PTE 下方标尺 -->

  <div style="display: grid; grid-template-columns: 10fr 44fr 2fr 1fr 1fr 1fr 1fr 1fr 1fr 1fr 1fr; text-align: center; font-size: 11px; opacity: 0.6; margin-top: 4px;">
    <div>63…54</div>
    <div>53…10</div>
    <div>9-8</div>
    <div style="grid-column: span 8; text-align: right; padding-right: 4px;">7 … 0</div>
  </div>

  <div style="margin-top: 24px; font-size: 13px; padding: 12px 16px; background: rgba(59, 130, 246, 0.08); border-left: 4px solid #3b82f6; border-radius: 0 6px 6px 0;">
    <span style="color: #60a5fa; font-weight: 700;">PPN</span> 在 PA 里从 <b>bit 12</b> 开始，在 PTE 里从 <b>bit 10</b> 开始 —— 中间差 <b>2 位</b>。这就是为什么提取时 `>>10`，放回时 `<<12`
  </div>

</div>

## `mappages` 函数

`mappages` 用于建立 物理内存 与虚拟地址之间的联系

```C
// Create PTEs for virtual addresses starting at va that refer to
// physical addresses starting at pa.
// va and size MUST be page-aligned.
// Returns 0 on success, -1 if walk() couldn't
// allocate a needed page-table page.
int
mappages(pagetable_t pagetable, uint64 va, 
        uint64 size, uint64 pa, int perm)
{
    uint64 a, last;
    pte_t *pte;
    //检查对齐
    if ((va % PGSIZE) != 0)
        panic("mappages: va not aligned");

    if ((size % PGSIZE) != 0)
        panic("mappages: size not aligned");

    if (size == 0)
        panic("mappages: size");

    a = va;
    last = va + size - PGSIZE;
    //for循环实现批量映射
    for (;;) {
        if ((pte = walk(pagetable, a, 1)) == 0)
            return -1;
        if (*pte & PTE_V)
            panic("mappages: remap");
        //将地址和权限写入pte
        *pte = PA2PTE(pa) | perm | PTE_V;

        if (a == last)
            break;
        //移动至下一页
        a += PGSIZE;
        pa += PGSIZE;
    }
    return 0;
}
```

## 用户地址空间与内核地址空间

用户地址空间

<div style="padding: 32px 24px; border-radius: 12px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif; color: #e0e0e0; max-width: 500px; margin: 24px auto; box-sizing: border-box;">
  <div style="text-align: center; font-weight: 600; font-size: 18px; margin-bottom: 28px; color: #e0e0e0; letter-spacing: 0.5px;">
    xv6 用户地址空间布局
  </div>
  <div style="display: flex; flex-direction: column; font-size: 14px; position: relative;">
    <div style="display: flex;">
      <!-- 左侧地址标签栏 (绝对定位精准对齐右侧加高后的区块) -->
      <div style="width: 110px; flex: none; position: relative; padding-right: 16px; font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; font-size: 12px; color: #888; text-align: right;">
        <div style="position: absolute; top: 0; right: 16px; transform: translateY(-50%);">MAXVA</div>
        <div style="position: absolute; top: 75px; right: 16px; transform: translateY(-50%);">TRAMPOLINE</div>
        <div style="position: absolute; top: 150px; right: 16px; transform: translateY(-50%);">TRAPFRAME</div>
        <div style="position: absolute; top: 385px; right: 16px; transform: translateY(-50%);">p-&gt;sz</div>
        <div style="position: absolute; bottom: 0; right: 16px; transform: translateY(50%);">0</div>
      </div>
      <!-- 右侧内存区块 -->
      <div style="flex: 1; display: flex; flex-direction: column; border: 1px solid #444; border-radius: 8px; overflow: hidden; background-color: #2b2b36;">
        <div style="height: 75px; display: flex; align-items: center; justify-content: space-between; padding: 0 16px; background-color: #1a2d3d; border-bottom: 1px solid #444;">
          <span style="font-weight: 600; color: #6da3ef; font-size: 14px;">trampoline</span>
          <span style="font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; font-size: 12px; color: #6da3ef; opacity: 0.8;">内核跳板代码</span>
        </div>
        <div style="height: 75px; display: flex; align-items: center; justify-content: space-between; padding: 0 16px; background-color: #2d1a22; border-bottom: 1px solid #444;">
          <span style="font-weight: 600; color: #e57e96; font-size: 14px;">trapframe</span>
          <span style="font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; font-size: 12px; color: #e57e96; opacity: 0.8;">保存用户上下文</span>
        </div>
        <div style="height: 75px; display: flex; align-items: center; justify-content: space-between; padding: 0 16px; background-color: #261e35; border-bottom: 1px solid #444;">
          <span style="font-weight: 600; color: #b380c9; font-size: 14px;">用户栈 stack</span>
          <span style="font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; font-size: 12px; color: #b380c9; opacity: 0.8;">向低地址增长</span>
        </div>
        <div style="height: 40px; display: flex; align-items: center; justify-content: space-between; padding: 0 16px; background: repeating-linear-gradient(45deg, #2a1818, #2a1818 6px, #201212 6px, #201212 12px); border-bottom: 1px solid #444;">
          <span style="font-weight: 600; color: #e55e5e; font-size: 13px;">guard page</span>
          <span style="font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; font-size: 11px; color: #e55e5e; opacity: 0.8;">不可访问</span>
        </div>
        <div style="height: 120px; display: flex; flex-direction: column; justify-content: center; align-items: center; background-color: #2b2416; border-bottom: 1px solid #444;">
          <span style="font-weight: 600; color: #d9a358; margin-bottom: 6px; font-size: 14px;">heap (堆)</span>
          <span style="font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; font-size: 12px; color: #d9a358; opacity: 0.8;">↑ sbrk() 向上增长</span>
        </div>
        <div style="height: 75px; display: flex; align-items: center; justify-content: space-between; padding: 0 16px; background-color: #182e1d; border-bottom: 1px solid #444;">
          <span style="font-weight: 600; color: #86c984; font-size: 14px;">data (.data + .bss)</span>
          <span style="font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; font-size: 12px; color: #86c984; opacity: 0.8;">全局/静态变量</span>
        </div>
        <div style="height: 75px; display: flex; align-items: center; justify-content: space-between; padding: 0 16px; background-color: #1a2436;">
          <span style="font-weight: 600; color: #7b9ff2; font-size: 14px;">text (代码段)</span>
          <span style="font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; font-size: 12px; color: #7b9ff2; opacity: 0.8;">只读、可执行</span>
        </div>
      </div>
    </div>
  </div>
  <div style="margin-top: 24px; font-size: 12px; color: #888; line-height: 1.6; font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; border-top: 1px solid #333; padding-top: 16px;">
    <div style="margin-top: 10px; opacity: 0.7;">* 各段高度仅为示意，实际依赖页面（PGSIZE）对齐。</div>
  </div>
</div>

### 区域功能详解

<div style="max-width:860px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI','PingFang SC','Microsoft YaHei',sans-serif;font-size:14px;line-height:1.7;">
<div style="font-family:ui-monospace,Menlo,Consolas,monospace;font-size:11px;letter-spacing:.12em;opacity:.55;margin-bottom:12px;">进程地址空间布局 · 低地址 ↑ 高地址</div>
<div style="display:flex;flex-wrap:wrap;gap:14px;padding:12px 16px;margin-bottom:10px;border:1px solid rgba(148,163,184,.3);border-left:4px solid #c0392b;border-radius:10px;"><div style="flex:0 0 150px;"><div style="font-family:ui-monospace,Menlo,monospace;font-size:15px;font-weight:700;color:#c0392b;">text</div><div style="font-size:12px;opacity:.55;">代码段 · R-X</div></div><div style="flex:1 1 320px;">实际上是编译后的机器指令，<strong>只读、可执行</strong>，<code>pc</code> 所指向的常常就是这个区域。值得了解的是，在 RISC-V 中许多指令占 <strong>4 字节</strong>，而在 x86 中许多指令占 <strong>2 字节</strong>。</div></div>
<div style="display:flex;flex-wrap:wrap;gap:14px;padding:12px 16px;margin-bottom:10px;border:1px solid rgba(148,163,184,.3);border-left:4px solid #b8860b;border-radius:10px;"><div style="flex:0 0 150px;"><div style="font-family:ui-monospace,Menlo,monospace;font-size:15px;font-weight:700;color:#b8860b;">rodata</div><div style="font-size:12px;opacity:.55;">只读数据段 · R--</div></div><div style="flex:1 1 320px;">存储着只读数据，夹在 <code>text</code> 和 <code>data</code> 之间（图中未画出）。</div></div>
<div style="display:flex;flex-wrap:wrap;gap:14px;padding:12px 16px;margin-bottom:10px;border:1px solid rgba(148,163,184,.3);border-left:4px solid #0e7490;border-radius:10px;"><div style="flex:0 0 150px;"><div style="font-family:ui-monospace,Menlo,monospace;font-size:15px;font-weight:700;color:#0e7490;">data</div><div style="font-size:12px;opacity:.55;">数据段 · RW-</div></div><div style="flex:1 1 320px;">包括 <code>.data</code> 和 <code>.bss</code>：<code>.data</code> 是<strong>已初始化</strong>的数据，<code>.bss</code> 是<strong>未初始化或初始化为 0</strong> 的数据。</div></div>
<div style="display:flex;flex-wrap:wrap;gap:14px;padding:12px 16px;margin-bottom:10px;border:1px solid rgba(148,163,184,.3);border-left:4px solid #1d6fd0;border-radius:10px;"><div style="flex:0 0 150px;"><div style="font-family:ui-monospace,Menlo,monospace;font-size:15px;font-weight:700;color:#1d6fd0;">heap</div><div style="font-size:12px;opacity:.55;">堆区 · RW-</div></div><div style="flex:1 1 320px;">向<strong>高地址</strong>方向增长，使用 <code>.sbrk()</code> 增大或缩小。</div></div>
<div style="display:flex;flex-wrap:wrap;gap:14px;padding:12px 16px;margin-bottom:10px;border:1px solid rgba(148,163,184,.3);border-left:4px solid #c62828;border-radius:10px;"><div style="flex:0 0 150px;"><div style="font-family:ui-monospace,Menlo,monospace;font-size:15px;font-weight:700;color:#c62828;">guard page</div><div style="font-size:12px;opacity:.55;">保护页 · ---</div></div><div style="flex:1 1 320px;"><strong>不可访问</strong>，访问此区域时触发缺页异常（Page Fault），内核杀死该进程。常用来检测栈溢出；当然，当堆区过高时也会访问到这个区域。</div></div>
<div style="display:flex;flex-wrap:wrap;gap:14px;padding:12px 16px;margin-bottom:10px;border:1px solid rgba(148,163,184,.3);border-left:4px solid #7c3aed;border-radius:10px;"><div style="flex:0 0 150px;"><div style="font-family:ui-monospace,Menlo,monospace;font-size:15px;font-weight:700;color:#7c3aed;">stack</div><div style="font-size:12px;opacity:.55;">栈 · RW-</div></div><div style="flex:1 1 320px;">可以说是最重要且最容易出错的区域之一，向<strong>低地址</strong>增长。值得一提的是，xv6 的栈相当小，可能申请 4096 个 bytes 就爆栈了。</div></div>
<div style="display:flex;flex-wrap:wrap;gap:14px;padding:12px 16px;margin-bottom:10px;border:1px solid rgba(148,163,184,.3);border-left:4px solid #c2570c;border-radius:10px;"><div style="flex:0 0 150px;"><div style="font-family:ui-monospace,Menlo,monospace;font-size:15px;font-weight:700;color:#c2570c;">trapframe</div><div style="font-size:12px;opacity:.55;">陷阱帧 · RW-</div></div><div style="flex:1 1 320px;">保存系统调用时的上下文，在系统调用的 Lab 中已详细了解了该区域。每个 <code>struct proc</code> 都有一个 <code>trapframe</code> 字段，用于访问该进程上下文内容。</div></div>
<div style="display:flex;flex-wrap:wrap;gap:14px;padding:12px 16px;margin-bottom:10px;border:1px solid rgba(148,163,184,.3);border-left:4px solid #15803d;border-radius:10px;"><div style="flex:0 0 150px;"><div style="font-family:ui-monospace,Menlo,monospace;font-size:15px;font-weight:700;color:#15803d;">trampoline</div><div style="font-size:12px;opacity:.55;">跳板页 · R-X</div></div><div style="flex:1 1 320px;">保存着系统调用时的内核跳转机器指令，也就是 <code>trampoline.S</code> 中所呈现的汇编指令。它同时被映射在用户页表和内核页表的同一虚拟地址上，因为陷入内核态时也需要访问该区域</div></div>
</div>

---

### 内核地址空间

<div style="padding: 32px 24px; border-radius: 12px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif; color: #e0e0e0; max-width: 560px; margin: 24px auto;  box-sizing: border-box; position: relative;">

  <div style="text-align: center; font-weight: 600; font-size: 18px; margin-bottom: 24px; color: #e0e0e0; letter-spacing: 0.5px;">
    xv6 内核地址空间 (虚拟 &rarr; 物理映射)
  </div>
  <div style="position: relative; width: 100%; height: 780px; font-size: 12px; font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;">
    <!-- 顶部标题 -->
    <div style="position: absolute; top: 0; left: 0; width: 180px; text-align: center; font-weight: 600; font-size: 14px; color: #888;">Virtual Addresses</div>
    <div style="position: absolute; top: 0; right: 0; width: 180px; text-align: center; font-weight: 600; font-size: 14px; color: #888;">Physical Addresses</div>
    <!-- 左侧地址标签 -->
    <div style="position: absolute; top: 20px; left: -80px; width: 70px; text-align: right; color: #888; transform: translateY(-50%);">MAXVA</div>
    <div style="position: absolute; top: 260px; left: -80px; width: 70px; text-align: right; color: #888; transform: translateY(-50%); line-height: 1.2;">PHYSTOP<br>(0x88000000)</div>
    <div style="position: absolute; top: 440px; left: -80px; width: 70px; text-align: right; color: #888; transform: translateY(-50%); line-height: 1.2;">KERNBASE<br>(0x80000000)</div>
    <div style="position: absolute; top: 540px; left: -80px; width: 70px; text-align: right; color: #888; transform: translateY(-50%);">0x10001000</div>
    <div style="position: absolute; top: 570px; left: -80px; width: 70px; text-align: right; color: #888; transform: translateY(-50%);">0x10000000</div>
    <div style="position: absolute; top: 600px; left: -80px; width: 70px; text-align: right; color: #888; transform: translateY(-50%);">0x0C000000</div>
    <div style="position: absolute; bottom: 0; left: -80px; width: 70px; text-align: right; color: #888;">0</div>
    <!-- 右侧地址标签 -->
    <div style="position: absolute; top: 20px; right: -80px; width: 70px; text-align: left; color: #888; transform: translateY(-50%);">2^56-1</div>
    <div style="position: absolute; top: 260px; right: -80px; width: 70px; text-align: left; color: #888; transform: translateY(-50%);">0x88000000</div>
    <div style="position: absolute; top: 440px; right: -80px; width: 70px; text-align: left; color: #888; transform: translateY(-50%);">0x80000000</div>
    <div style="position: absolute; top: 635px; right: -80px; width: 70px; text-align: left; color: #888; transform: translateY(-50%);">0x02000000</div>
    <div style="position: absolute; top: 715px; right: -80px; width: 70px; text-align: left; color: #888; transform: translateY(-50%);">0x1000</div>
    <div style="position: absolute; bottom: 0; right: -80px; width: 70px; text-align: left; color: #888;">0</div>
    <!-- 左侧虚拟区块 -->
    <div style="position: absolute; top: 20px; left: 0; width: 180px; height: 36px; background-color: #1a2d3d; border: 1px solid #444; border-radius: 4px; display: flex; align-items: center; justify-content: center; color: #6da3ef;">Trampoline</div>
    <div style="position: absolute; top: 60px; left: 0; width: 180px; height: 20px; background: repeating-linear-gradient(45deg, #2a1818, #2a1818 6px, #201212 6px, #201212 12px); border: 1px solid #444; border-radius: 4px; display: flex; align-items: center; justify-content: center; color: #e55e5e; font-size: 11px;">Guard page</div>
    <div style="position: absolute; top: 84px; left: 0; width: 180px; height: 36px; background-color: #261e35; border: 1px solid #444; border-radius: 4px; display: flex; align-items: center; justify-content: center; color: #b380c9;">Kstack 0</div>
    <div style="position: absolute; top: 124px; left: 0; width: 180px; height: 20px; background: repeating-linear-gradient(45deg, #2a1818, #2a1818 6px, #201212 6px, #201212 12px); border: 1px solid #444; border-radius: 4px; display: flex; align-items: center; justify-content: center; color: #e55e5e; font-size: 11px;">Guard page</div>
    <div style="position: absolute; top: 148px; left: 0; width: 180px; height: 36px; background-color: #261e35; border: 1px solid #444; border-radius: 4px; display: flex; align-items: center; justify-content: center; color: #b380c9;">Kstack 1</div>
    <div style="position: absolute; top: 188px; left: 0; width: 180px; height: 20px; display: flex; align-items: center; justify-content: center; color: #888; font-size: 16px; letter-spacing: 2px;">...</div>
    <div style="position: absolute; top: 260px; left: 0; width: 180px; height: 100px; background-color: #2b2416; border: 1px solid #444; border-radius: 4px; display: flex; align-items: center; justify-content: center; color: #d9a358;">Free memory</div>
    <div style="position: absolute; top: 364px; left: 0; width: 180px; height: 40px; background-color: #182e1d; border: 1px solid #444; border-radius: 4px; display: flex; align-items: center; justify-content: center; color: #86c984;">Kernel data</div>
    <div style="position: absolute; top: 408px; left: 0; width: 180px; height: 40px; background-color: #1a2436; border: 1px solid #444; border-radius: 4px; display: flex; align-items: center; justify-content: center; color: #7b9ff2;">Kernel text</div>
    <div style="position: absolute; top: 540px; left: 0; width: 180px; height: 26px; background-color: #2b2b36; border: 1px solid #444; border-radius: 4px; display: flex; align-items: center; justify-content: center; color: #ccc;">VIRTIO disk</div>
    <div style="position: absolute; top: 570px; left: 0; width: 180px; height: 26px; background-color: #2b2b36; border: 1px solid #444; border-radius: 4px; display: flex; align-items: center; justify-content: center; color: #ccc;">UART0</div>
    <div style="position: absolute; top: 600px; left: 0; width: 180px; height: 26px; background-color: #2b2b36; border: 1px solid #444; border-radius: 4px; display: flex; align-items: center; justify-content: center; color: #ccc;">PLIC</div>
    <!-- 右侧物理区块 -->
    <div style="position: absolute; top: 20px; right: 0; width: 180px; height: 236px; background-color: #2b2b36; border: 1px solid #444; border-radius: 4px; display: flex; align-items: center; justify-content: center; color: #888;">Unused</div>
    <div style="position: absolute; top: 260px; right: 0; width: 180px; height: 176px; background-color: #2b2416; border: 1px solid #444; border-radius: 4px; display: flex; align-items: center; justify-content: center; color: #d9a358;">Physical memory (RAM)</div>
    <div style="position: absolute; top: 440px; right: 0; width: 180px; height: 96px; background-color: #2b2b36; border: 1px solid #444; border-radius: 4px; display: flex; flex-direction: column; align-items: center; justify-content: center; color: #888; text-align: center; line-height: 1.4;">Unused<br>and other I/O devices</div>
    <div style="position: absolute; top: 540px; right: 0; width: 180px; height: 26px; background-color: #2b2b36; border: 1px solid #444; border-radius: 4px; display: flex; align-items: center; justify-content: center; color: #ccc;">VIRTIO disk</div>
    <div style="position: absolute; top: 570px; right: 0; width: 180px; height: 26px; background-color: #2b2b36; border: 1px solid #444; border-radius: 4px; display: flex; align-items: center; justify-content: center; color: #ccc;">UART0</div>
    <div style="position: absolute; top: 600px; right: 0; width: 180px; height: 26px; background-color: #2b2b36; border: 1px solid #444; border-radius: 4px; display: flex; align-items: center; justify-content: center; color: #ccc;">PLIC</div>
    <div style="position: absolute; top: 635px; right: 0; width: 180px; height: 26px; background-color: #2b2b36; border: 1px solid #444; border-radius: 4px; display: flex; align-items: center; justify-content: center; color: #ccc;">CLINT</div>
    <div style="position: absolute; top: 665px; right: 0; width: 180px; height: 46px; background-color: #2b2b36; border: 1px solid #444; border-radius: 4px; display: flex; align-items: center; justify-content: center; color: #888;">Unused</div>
    <div style="position: absolute; top: 715px; right: 0; width: 180px; height: 26px; background-color: #2b2b36; border: 1px solid #444; border-radius: 4px; display: flex; align-items: center; justify-content: center; color: #ccc;">boot ROM</div>
    <div style="position: absolute; top: 745px; right: 0; width: 180px; height: 26px; background-color: #2b2b36; border: 1px solid #444; border-radius: 4px; display: flex; align-items: center; justify-content: center; color: #888;">Unused</div>
    <!-- 中间映射连线 (SVG) -->
    <svg style="position: absolute; top: 0; left: 190px; width: 150px; height: 780px; pointer-events: none;">
      <defs>
        <marker id="arrow" viewBox="0 0 10 10" refX="10" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
          <path d="M 0 0 L 10 5 L 0 10 z" fill="#888" />
        </marker>
      </defs>
      <!-- Trampoline -> RAM Top -->
      <line x1="0" y1="38" x2="130" y2="280" stroke="#888" stroke-width="1.5" stroke-dasharray="3,3" marker-end="url(#arrow)" />
      <!-- Kstack 0 -> RAM -->
      <line x1="0" y1="102" x2="130" y2="320" stroke="#888" stroke-width="1.5" stroke-dasharray="3,3" marker-end="url(#arrow)" />
      <!-- Kstack 1 -> RAM -->
      <line x1="0" y1="166" x2="130" y2="350" stroke="#888" stroke-width="1.5" stroke-dasharray="3,3" marker-end="url(#arrow)" />
      <!-- Free memory Top (PHYSTOP) -> RAM Top -->
      <line x1="0" y1="260" x2="130" y2="260" stroke="#888" stroke-width="1.5" stroke-dasharray="3,3" marker-end="url(#arrow)" />
      <!-- Free memory Bottom -> RAM Mid -->
      <line x1="0" y1="360" x2="130" y2="360" stroke="#888" stroke-width="1.5" stroke-dasharray="3,3" marker-end="url(#arrow)" />
      <!-- Kernel data -> RAM Bottom -->
      <line x1="0" y1="384" x2="130" y2="384" stroke="#888" stroke-width="1.5" stroke-dasharray="3,3" marker-end="url(#arrow)" />
      <!-- Kernel text -> RAM Bottom edge -->
      <line x1="0" y1="428" x2="130" y2="428" stroke="#888" stroke-width="1.5" stroke-dasharray="3,3" marker-end="url(#arrow)" />
      <!-- VIRTIO -> VIRTIO -->
      <line x1="0" y1="553" x2="130" y2="553" stroke="#888" stroke-width="1.5" stroke-dasharray="3,3" marker-end="url(#arrow)" />
      <!-- UART0 -> UART0 -->
      <line x1="0" y1="583" x2="130" y2="583" stroke="#888" stroke-width="1.5" stroke-dasharray="3,3" marker-end="url(#arrow)" />
      <!-- PLIC -> PLIC -->
      <line x1="0" y1="613" x2="130" y2="613" stroke="#888" stroke-width="1.5" stroke-dasharray="3,3" marker-end="url(#arrow)" />
    </svg>
  </div>
  <div style="margin-top: 10px; font-size: 12px; color: #888; font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; text-align: center;">
    * 左右地址空间通过页表映射对应
  </div>
</div>

内核地址空间多采用直接映射，内核空间从 `KERNBASE` 开始

值得一提的是，每个进程都有一个内核栈，但内核栈并不保存在进程的用户地址空间中，而是保存在内核地址空间中，内核地址空间为所有进程共享，但只有当 CPU 处于 Supervisor Mode 时才可以访问。内核栈之间也会插入**guard page**，以防止栈溢出

## 物理页的分配

在 `walk` 函数中，若 `alloc` ≠ 0 时，会通过 `kalloc()` 函数新分配物理页，`kalloc` 实现在 `kernel/kalloc.c` 中

```C
// Allocate one 4096-byte page of physical memory.
// Returns a pointer that the kernel can use.
// Returns 0 if the memory cannot be allocated.
void *
kalloc(void)
{
  struct run *r;

  acquire(&kmem.lock);
  r = kmem.freelist;
  if (r)
    kmem.freelist = r->next;
  release(&kmem.lock);

  if (r)
    memset((char *)r, 5, PGSIZE); // fill with junk
  return (void *)r;
}
```

显然，`kalloc` 维护着一个链表，`freelist` 始终指向一个空闲页，当拿到空闲页时，会用 0x5 填充空闲页垃圾数据

<div style="padding:12px 16px;margin:10px 0;border:1px solid rgba(148,163,184,.3);border-left:4px solid #1d6fd0;border-radius:10px;background:rgba(29,111,208,.05);"><div style="font-family:ui-monospace,Menlo,monospace;font-size:13px;font-weight:700;color:#1d6fd0;margin-bottom:6px;">kalloc 功用</div><div style="font-size:14px;line-height:1.7;">
功能上，<code>kalloc</code>返回一个物理地址，但从实现上看，它返回的是一个指针，似乎更像是虚拟地址。实际上，<code>kalloc</code>只能由在内核态运行，由于内核采用直接映射，故虚拟地址等同于物理地址。当用户地址空间需要物理页时，由内核地址空间调用<code>kalloc</code>申请，然后通过<code>mappages</code>将物理页与虚拟地址产生联系

</div></div>

## 从虚拟地址到物理地址

我们以虚拟地址 <u>**0x0000_0000_0000_1004**</u> 为例串联起从虚拟地址到物理地址全过程

<div style="display:flex;gap:12px;padding:12px 16px;margin:10px 0;border:1px solid rgba(148,163,184,.3);border-radius:10px;"><div style="flex:0 0 26px;height:26px;border-radius:50%;background:rgba(29,111,208,.15);color:#1d6fd0;font-family:ui-monospace,Menlo,monospace;font-size:13px;font-weight:700;display:flex;align-items:center;justify-content:center;">1</div><div style="flex:1;"><div style="font-size:14px;font-weight:600;margin-bottom:2px;">拆分地址</div><div style="font-size:13.5px;line-height:1.7;opacity:.8;">
将虚拟地址后39位拆分，得到
<div style="padding:4px 16px;margin:10px 0;border:1px solid rgba(148,163,184,.3);border-radius:10px;">

<div style="display:flex;gap:12px;padding:8px 0;border-bottom:1px solid rgba(148,163,184,.15);"><div style="flex:0 0 120px;font-family:ui-monospace,Menlo,monospace;font-size:13px;font-weight:600;color:#1d6fd0;">VPN[0]</div><div style="flex:1;font-size:13.5px;line-height:1.7;">1</div></div>

<div style="display:flex;gap:12px;padding:8px 0;"><div style="flex:0 0 120px;font-family:ui-monospace,Menlo,monospace;font-size:13px;font-weight:600;color:#1d6fd0;">VPN[1]</div><div style="flex:1;font-size:13.5px;line-height:1.7;">0</div></div>

<div style="display:flex;gap:12px;padding:8px 0;"><div style="flex:0 0 120px;font-family:ui-monospace,Menlo,monospace;font-size:13px;font-weight:600;color:#1d6fd0;">VPN[2]</div><div style="flex:1;font-size:13.5px;line-height:1.7;">0</div></div>

<div style="display:flex;gap:12px;padding:8px 0;"><div style="flex:0 0 120px;font-family:ui-monospace,Menlo,monospace;font-size:13px;font-weight:600;color:#1d6fd0;">Offset</div><div style="flex:1;font-size:13.5px;line-height:1.7;">4</div></div>

</div>

</div></div></div>

<div style="display:flex;gap:12px;padding:12px 16px;margin:10px 0;border:1px solid rgba(148,163,184,.3);border-radius:10px;">
<div style="flex:0 0 26px;height:26px;border-radius:50%;background:rgba(29,111,208,.15);color:#1d6fd0;font-family:ui-monospace,Menlo,monospace;font-size:13px;font-weight:700;display:flex;align-items:center;justify-content:center;">2</div><div style="flex:1;"><div style="font-size:14px;font-weight:600;margin-bottom:2px;">用户态访问</div><div style="font-size:13.5px;line-height:1.7;opacity:.8;">通过<code>*</code>访问虚拟地址，此时CPU处于用户态
<div>1. 先从 <code>satp</code> 拿到根页表基址，找到第 <b>VPN[2] = 0 </b> 个PTE，发现它是有效的，从这个PTE中提取出出中间级页表的物理地址</div>

<div>2. 再在前面的物理地址基址中，找到第 <b>VPN[1] = 0 </b> 个PTE，发现它是有效的，从这个PTE中提取出叶子级页表的物理地址</div>

<div>3. 再在前面的物理地址基址，找到第 <b>VPN[0] = 1 </b> 个PTE，发现它是有效的，从这个PTE中提取物理页号，再拼上12位的<b>offset</b> , 得到物理地址</div>

<div>4. 最后去相应物理地址出读出数据</div>

</div></div></div>

<div style="display:flex;gap:12px;padding:12px 16px;margin:10px 0;border:1px solid rgba(148,163,184,.3);border-radius:10px;"><div style="flex:0 0 26px;height:26px;border-radius:50%;background:rgba(29,111,208,.15);color:#1d6fd0;font-family:ui-monospace,Menlo,monospace;font-size:13px;font-weight:700;display:flex;align-items:center;justify-content:center;">3</div><div style="flex:1;"><div style="font-size:14px;font-weight:600;margin-bottom:2px;">分配新内存</div><div style="font-size:13.5px;line-height:1.7;opacity:.8;">假设用户程序调用了<code>malloc</code>函数申请堆内存
<div>
<code>malloc</code> 会触发 <code>sbrk</code>系统调用，然后进入内核态，内核调用<code>kalloc</code>函数申请物理页，再调用<code>mappages</code>将物理内存与用户的虚拟地址产生映射关系，最后返回物理页对应的虚拟地址
</div>

</div></div></div>

## 最后

虚拟内存机制是操作系统的重要机制，虚拟内存给进程提供连续、独立的虚拟地址空间，同时，物理页的申请由内核管理，保障了系统的安全。由于每个进程间虚拟内存的独立，保障了物理内存访问的安全性，也有利于实现进程间隔离。

当然，虚拟内存并不只是软件的设计，更有CPU硬件的约束。在CPU中，
**MMU(Memory Management Unit)** 作为硬件模块，遵循特定的索引访问机制。更确切地说，内核负责建立和维护页表、管理物理页框和映射策略；MMU 按硬件规定的页表格式和遍历规则完成地址转换与权限检查；缺页时 MMU 触发异常，由内核处理。