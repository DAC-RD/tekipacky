-- CreateEnum
CREATE TYPE "Mode" AS ENUM ('EASY', 'NORMAL', 'HARD');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "timezone" TEXT NOT NULL DEFAULT 'Asia/Tokyo',
    "points" INTEGER NOT NULL DEFAULT 0,
    "mode" "Mode" NOT NULL DEFAULT 'NORMAL',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Action" (
    "id" SERIAL NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "desc" TEXT NOT NULL DEFAULT '',
    "tags" TEXT[],
    "hurdle" INTEGER NOT NULL,
    "time" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Action_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Reward" (
    "id" SERIAL NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "desc" TEXT NOT NULL DEFAULT '',
    "tags" TEXT[],
    "satisfaction" INTEGER NOT NULL,
    "time" INTEGER NOT NULL,
    "price" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Reward_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DoneAction" (
    "id" SERIAL NOT NULL,
    "userId" TEXT NOT NULL,
    "actionId" INTEGER,
    "title" TEXT NOT NULL,
    "pt" INTEGER NOT NULL,
    "count" INTEGER NOT NULL,
    "date" TEXT NOT NULL,

    CONSTRAINT "DoneAction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DoneReward" (
    "id" SERIAL NOT NULL,
    "userId" TEXT NOT NULL,
    "rewardId" INTEGER,
    "title" TEXT NOT NULL,
    "pt" INTEGER NOT NULL,
    "count" INTEGER NOT NULL,
    "date" TEXT NOT NULL,

    CONSTRAINT "DoneReward_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "DoneAction_userId_actionId_date_key" ON "DoneAction"("userId", "actionId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "DoneReward_userId_rewardId_date_key" ON "DoneReward"("userId", "rewardId", "date");

-- AddForeignKey
ALTER TABLE "Action" ADD CONSTRAINT "Action_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Reward" ADD CONSTRAINT "Reward_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DoneAction" ADD CONSTRAINT "DoneAction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DoneAction" ADD CONSTRAINT "DoneAction_actionId_fkey" FOREIGN KEY ("actionId") REFERENCES "Action"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DoneReward" ADD CONSTRAINT "DoneReward_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DoneReward" ADD CONSTRAINT "DoneReward_rewardId_fkey" FOREIGN KEY ("rewardId") REFERENCES "Reward"("id") ON DELETE SET NULL ON UPDATE CASCADE;
