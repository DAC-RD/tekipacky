-- CreateIndex
CREATE INDEX "Action_userId_idx" ON "Action"("userId");

-- CreateIndex
CREATE INDEX "DoneAction_userId_date_idx" ON "DoneAction"("userId", "date");

-- CreateIndex
CREATE INDEX "DoneReward_userId_date_idx" ON "DoneReward"("userId", "date");

-- CreateIndex
CREATE INDEX "Reward_userId_idx" ON "Reward"("userId");
