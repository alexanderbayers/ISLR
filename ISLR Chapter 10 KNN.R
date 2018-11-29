library(ISLR)
set.seed(4)
x1 <- c(1, 1, 0, 5, 6, 4)
x2 <- c(4, 3, 4, 1, 2, 0)
ylabel <- sample(c(1, 2), 6, TRUE)
my.frame <- data.frame(x1, x2, ylabel)
oldylabel  <- rep(0, 6)
plot(x = x1, y = x2, col = ylabel, pch = 16)

#TOFIX - addition should be working by column, not by row
while (any(oldylabel != my.frame$ylabel)){
  y1.mean <- colMeans(subset(my.frame, ylabel == 1))
  y2.mean <- colMeans(subset(my.frame, ylabel == 2))
  
  y1.demeaned <- sweep(my.frame, 2, y1.mean)
  y2.demeaned <- sweep(my.frame, 2, y2.mean)
  
  x1.distance <- (y1.demeaned$x1^2 + y1.demeaned$x2^2)^.5
  x2.distance <- (y2.demeaned$x1^2 + y2.demeaned$x2^2)^.5
  oldylabel <- my.frame$ylabel
  my.frame$ylabel <- ifelse(x1.distance < x2.distance, 1, 2)
  newtest = 1
}
plot(x = x1, y = x2, col = my.frame$ylabel, pch = 16)