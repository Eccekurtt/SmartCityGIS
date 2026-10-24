using SmartCityGis.Api.Common;

namespace SmartCityGis.Tests.Unit;

public class TextFoldingTests
{
    [Theory]
    [InlineData("KIZILAY", "kizilay")]
    [InlineData("Kızılay", "kizilay")]
    [InlineData("ÇANKAYA", "cankaya")]
    [InlineData("Güvenpark", "guvenpark")]
    [InlineData("İstanbul Şişli", "istanbul sisli")]
    [InlineData("  Öğretmen Evi  ", "ogretmen evi")]
    public void Fold_ConvertsTurkishLettersToLowerAscii(string input, string expected)
    {
        Assert.Equal(expected, TextFolding.Fold(input));
    }

    [Theory]
    [InlineData(null)]
    [InlineData("")]
    [InlineData("   ")]
    public void Fold_ReturnsEmptyForBlankInput(string? input)
    {
        Assert.Equal("", TextFolding.Fold(input));
    }

    [Fact]
    public void Fold_TreatsDottedAndDotlessIAsTheSame() =>
        Assert.Equal(TextFolding.Fold("Iğdır"), TextFolding.Fold("ığdır"));

    [Theory]
    [InlineData("100%", "100\\%")]
    [InlineData("a_b", "a\\_b")]
    [InlineData("c:\\x", "c:\\\\x")]
    [InlineData("normal", "normal")]
    public void EscapeLike_NeutralizesWildcards(string input, string expected)
    {
        Assert.Equal(expected, TextFolding.EscapeLike(input));
    }
}
