library(ISLR)

#A
set.seed(5)
innov.matrix <- matrix(rnorm(3000), nrow = 60, ncol = 50)
mean.shift <- c(rep(-.75, 20), rep(0, 20), rep(.75, 20))
mean.matrix <- innov.matrix + mean.shift

#B
sim.pca <- prcomp(mean.matrix, scale = TRUE)
plot(x = sim.pca$x[,"PC1"], sim.pca$x[,"PC2"], col = c(rep("red", 20), rep("blue", 20), rep("green", 20)), pch = 16)

#C
km.out=kmeans(mean.matrix,3,nstart=20)
print(km.out)
