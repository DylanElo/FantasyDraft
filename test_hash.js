function hashCode(str) {
    let a = 1, b = 0;
    for (let i = 0; i < str.length; i++) {
        a = (a + str.charCodeAt(i)) % 65521;
        b = (b + a) % 65521;
    }
    return ((b << 16) | a) >>> 0;
}
console.log(hashCode("c6f891c0-3e11-4b7a-b606-956b7a996a08"));
