using Microsoft.EntityFrameworkCore;
using Starter.Core.Models;

namespace Starter.Infrastructure.Data;

public class AppDbContext(DbContextOptions<AppDbContext> options) : DbContext(options)
{
    public DbSet<User> Users => Set<User>();
    public DbSet<Role> Roles => Set<Role>();
    public DbSet<UserRole> UserRoles => Set<UserRole>();
    public DbSet<RolePermission> RolePermissions => Set<RolePermission>();
    public DbSet<Favorite> Favorites => Set<Favorite>();

    // Every DateTime is UTC. SQLite (and SQL Server datetime2) keep no time zone, so values would come
    // back as Unspecified and be serialized without "Z", and browsers would read them as local time.
    protected override void ConfigureConventions(ModelConfigurationBuilder configurationBuilder)
    {
        configurationBuilder.Properties<DateTime>().HaveConversion<UtcDateTimeConverter>();
        configurationBuilder.Properties<DateTime?>().HaveConversion<NullableUtcDateTimeConverter>();
    }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<User>(user =>
        {
            user.Property(u => u.Username).HasMaxLength(50);
            user.Property(u => u.NormalizedUsername).HasMaxLength(50);
            user.Property(u => u.Email).HasMaxLength(256);
            user.Property(u => u.NormalizedEmail).HasMaxLength(256);
            user.Property(u => u.PasswordHash).HasMaxLength(100);
            user.Property(u => u.FirstName).HasMaxLength(100);
            user.Property(u => u.LastName).HasMaxLength(100);

            user.HasIndex(u => u.NormalizedUsername).IsUnique();
            user.HasIndex(u => u.NormalizedEmail).IsUnique();
        });

        modelBuilder.Entity<Role>(role =>
        {
            role.Property(r => r.Name).HasMaxLength(100);
            role.Property(r => r.Description).HasMaxLength(500);
            role.HasIndex(r => r.Name).IsUnique();

            role.HasMany(r => r.Permissions)
                .WithOne()
                .HasForeignKey(p => p.RoleId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<UserRole>(userRole =>
        {
            userRole.HasKey(ur => new { ur.UserId, ur.RoleId });

            userRole.HasOne(ur => ur.User)
                .WithMany(u => u.UserRoles)
                .HasForeignKey(ur => ur.UserId)
                .OnDelete(DeleteBehavior.Cascade);

            // Restrict: a role still in use must never disappear from under its users.
            userRole.HasOne(ur => ur.Role)
                .WithMany(r => r.UserRoles)
                .HasForeignKey(ur => ur.RoleId)
                .OnDelete(DeleteBehavior.Restrict);
        });

        modelBuilder.Entity<RolePermission>(permission =>
        {
            permission.HasKey(p => new { p.RoleId, p.Module, p.Action });

            // Stored as text ("Users", "Edit") so the database stays readable
            // and enum members can be reordered without a data migration.
            permission.Property(p => p.Module).HasConversion<string>().HasMaxLength(50);
            permission.Property(p => p.Action).HasConversion<string>().HasMaxLength(50);
        });

        modelBuilder.Entity<Favorite>(favorite =>
        {
            favorite.Property(f => f.PhotoId).HasMaxLength(FavoriteLimits.PhotoIdLength);
            favorite.Property(f => f.Author).HasMaxLength(FavoriteLimits.AuthorLength);
            favorite.Property(f => f.Url).HasMaxLength(FavoriteLimits.UrlLength);
            favorite.Property(f => f.DownloadUrl).HasMaxLength(FavoriteLimits.UrlLength);

            // A photo is a favorite at most once per user.
            favorite.HasIndex(f => new { f.UserId, f.PhotoId }).IsUnique();

            favorite.HasOne(f => f.User)
                .WithMany()
                .HasForeignKey(f => f.UserId)
                .OnDelete(DeleteBehavior.Cascade);
        });
    }
}
