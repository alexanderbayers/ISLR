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

We would prefer a more flexible method when analyzing a large amount of data with a a relatively small number of predictors.  We would prefer a less flexible method 


#1
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
hist(Outstate)

2a