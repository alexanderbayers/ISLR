library("ISLR")
attach(College)

#Conceptual questions
#1a Flexible method would do better - small number of variables, large number of samples

#1b Inflexible method would be better - need more structure to deal with less flexibility

#1c More flexible - a linear method wouldnt allow it to fit flexibly enough

#1d  Less flexible - The greater variance would allow a less flexible method to overfit too much

#2a Regression, Inference, n = 500, p = 3
#2b Classification, Prediction, n = 20, p =14
#2c	Regression, Prediction, n = 52, 3

#3 This is separate

#4a Classifiction the regime in which a time series exists, Classifying letters from a handwritten sample, classifying whether or not is a recession
#4b Testing the effect of the change in a time series  

#5 A very flexible method of analysis can more easily adapt to nonlinearities or variations in structure in the underlying data.   However, with a small amoount of data a very flexible method can overfit and regardless will have higher variance.  Additionally, if we have a large number of predictors relative to data points a more flexible method will also be inclined to overfit.

#We would prefer a more flexible method when analyzing a large amount of data with a a relatively small number of predictors.  We would prefer a less flexible method 

#6 A parametric model implies much stricter restrictions on the model shape, whereas a
#nonparamtric model implies much more flexibility (Letting the data speak).

#7
#obs no1 3
#obs no2 2
#obs no3 sqrt(10)
#obs no4 sqrt(5)
#obs no5 sqrt(2)
#obs no6 sqrt(3)

#the relevant point is obs no5, which would be green
#the relevant points are obs no5, no6, and no2, which are 2 red and one green -
#so red
#if the bayes decision boundary is highly nonlinear, we would expect the best value
#to be small

#1
library(ISLR)
summary(College)

#1b
pairs(College[,1:10])

#1c
plot(Outstate ~ Private)

#1d
Elite=rep("No",nrow(College))
Elite[College$Top10perc >50]=" Yes"
Elite=as.factor(Elite)
College=data.frame(College , Elite)
summary(Elite)
plot(Outstate ~ Elite)

#1e
par(mfrow=c(2,2))
hist(Apps)
hist(Accept)
hist(Enroll)
hist(Top10perc)
hist(Top25perc)
hist(F.Undergrad)
hist(P.Undergrad)
hist(Outstate)
hist(Room.Board)
hist(Books)
hist(Personal)
hist(PhD)
hist(Terminal)
hist(S.F.Ratio)
hist(perc.alumni)
hist(Expend)
hist(Grad.Rate)


#2a
Auto = na.omit(Auto)
attach(Auto)
#Quantitative data is mpg, displacement, horsepower, weight, acceleration, 
#Qualitative data is cylinders, year, origin, name

#2b
range(mpg)
range(displacement)
range(horsepower)
range(weight)
range(acceleration)

#2c
mean(mpg)
sd(mpg)

mean(displacement)
sd(displacement)

mean(horsepower)
sd(horsepower)

mean(weight)
sd(weight)

mean(acceleration)
sd(acceleration)

#2d
#sorting/analysis on mpg
mpg_truc = mpg[order(mpg)][-seq(10, 85, by =1)]
range(mpg_truc)
mean(mpg_truc)
sd(mpg_truc)

#sorting/analysis on displacement
displacement_truc = displacement[order(displacement)][-seq(10, 85, by =1)]
range(displacement_truc)
mean(displacement_truc)
sd(displacement_truc)

#sorting/analysis on horsepower
horsepower_truc = horsepower[order(horsepower)][-seq(10, 85, by =1)]
range(horsepower_truc)
mean(horsepower_truc)
sd(horsepower_truc)

#sorting/analysis on weight
weight_truc = weight[order(weight)][-seq(10, 85, by =1)]
range(weight_truc)
mean(weight_truc)
sd(weight_truc)

#sorting/analysis on acceleration
acceleration_truc = acceleration[order(acceleration)][-seq(10, 85, by =1)]
range(acceleration_truc)
mean(acceleration_truc)
sd(acceleration_truc)

#2e
pairs(Auto)

#2f
#Out plots suggest cylinders, displacement, horsepower, weight, year would all be
#potential predictors based on the scatterplot

#Exercise 3
library(MASS)
#3a there are 506 rows and 14 columns

#3b
pairs(Boston)

#3c
attach(Boston)
plot(zn, crim)
plot(indus, crim)

#3e
nrow(Boston[Boston$chas == 1,])
#35

#3f
median(ptratio)
#The median student reacher ratio is 19.05