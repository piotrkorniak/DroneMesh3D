using DroneMesh3D.Core.Validation;
var validator = new AreaValidator();

// Test bowtie: BL -> TR -> BR -> TL -> BL
double[][] bowtie = [
    [0.0, 0.0],   // BL
    [1.0, 1.0],   // TR
    [1.0, 0.0],   // BR
    [0.0, 1.0],   // TL
    [0.0, 0.0]    // BL (close)
];

Console.WriteLine($"Has self-intersection: {validator.HasSelfIntersection(bowtie)}");

// Now let's see what the generator is actually creating at offset=0.0014:
var baseLon = 125.7;
var baseLat = -43.8;
var offset = 0.0014;

double[][] genBowtie = [
    [baseLon - offset, baseLat - offset],  // BL
    [baseLon + offset, baseLat + offset],  // TR
    [baseLon + offset, baseLat - offset],  // BR
    [baseLon - offset, baseLat + offset],  // TL
    [baseLon - offset, baseLat - offset]   // BL close
];

Console.WriteLine($"Gen bowtie has self-intersection: {validator.HasSelfIntersection(genBowtie)}");
Console.WriteLine("Points:");
foreach (var p in genBowtie) Console.WriteLine($"  [{p[0]:F4}, {p[1]:F4}]");

// Versus what the FsCheck output showed:
double[][] fsCheckOutput = [
    [125.6986, -43.8014],
    [125.7014, -43.8014],
    [125.7014, -43.7986],
    [125.6986, -43.7986],
    [125.6986, -43.8014]
];

Console.WriteLine($"\nFsCheck output has self-intersection: {validator.HasSelfIntersection(fsCheckOutput)}");
Console.WriteLine("FsCheck points:");
foreach (var p in fsCheckOutput) Console.WriteLine($"  [{p[0]:F4}, {p[1]:F4}]");
