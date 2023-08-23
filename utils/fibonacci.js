let memo = {};
function fibonacci(n) {
    if (n in memo) return memo[n];
    if (n <= 2) return 1;
    memo[n] = fibonacci(n - 1) + fibonacci(n - 2);
    return memo[n];
    }   
    module.exports = fibonacci;

    